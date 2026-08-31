import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { ulid } from '../../src/lib/ulid.js';
import { db } from './db.js';
import { capabilityRegistry } from './capabilities.js';
import * as tf from './trueforge.js';

// Session → Agent registry: maps TrueForge session IDs to the agent that owns them.
// This is the source-of-truth for MCP identity — NOT client-supplied headers or body fields.
const sessionAgentRegistry = new Map<string, string>();

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------------------------------------------------------
// 1. MCP Server Setup
// -----------------------------------------------------------------------------
const mcp = new McpServer({
  name: 'premortem-mcp',
  version: '1.0.0',
});

let mcpTransport: SSEServerTransport | null = null;

// Dynamically register all capabilities
for (const cap of capabilityRegistry.getAll()) {
  const schemaShape: Record<string, any> = {};
  for (const [key, prop] of Object.entries(cap.inputSchema.properties || {})) {
    const p = prop as any;
    if (p.type === 'string') schemaShape[key] = z.string().describe(p.description);
    else if (p.type === 'number') schemaShape[key] = z.number().describe(p.description);
  }

  mcp.tool(
    cap.name,
    cap.description,
    schemaShape,
    async (args: any, extra: any) => {
      // Resolve the calling agent from the session registry.
      // The MCP session is established during trial creation and registered with a
      // known agentId. This prevents any agent from spoofing another agent's clearance.
      const sessionId: string | undefined = (extra as any)?.sessionId;
      const agentId = sessionId ? (sessionAgentRegistry.get(sessionId) ?? null) : null;

      if (!agentId) {
        // No registered session — block by default (fail-secure)
        return {
          content: [{ type: 'text', text: `[MCP: ${cap.name}] BLOCKED: Unregistered session. No agent identity could be resolved.` }],
          isError: true
        };
      }

      const policy = db.policies.get(agentId, cap.name);
      
      if (!policy.certificationRequired) {
        return {
          content: [{
            type: 'text',
            text: `[MCP: ${cap.name}] EXECUTED SUCCESSFULLY. (Policy allows bypass for ${agentId})`
          }]
        };
      }

      const authState = db.authorizations.get(agentId, cap.name);
      
      if (authState.status === 'AUTHORIZED') {
        return {
          content: [{
            type: 'text',
            text: `[MCP: ${cap.name}] AUTHORIZED AND EXECUTED SUCCESSFULLY for agent ${agentId}. Clearance verified.`
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: `[MCP: ${cap.name}] BLOCKED: Agent ${agentId} has no clearance for ${cap.name}. Certification and human authorization required.`
        }],
        isError: true
      };
    }
  );
}

app.get('/mcp', async (req, res) => {
  mcpTransport = new SSEServerTransport('/mcp/messages', res);
  await mcp.connect(mcpTransport);
});

app.post('/mcp/messages', async (req, res) => {
  if (mcpTransport) {
    await mcpTransport.handlePostMessage(req, res);
  } else {
    res.status(500).send('MCP not initialized');
  }
});

// -----------------------------------------------------------------------------
// 2. REST & SSE API for PREMORTEM Frontend
// -----------------------------------------------------------------------------

app.post('/api/trials', async (req, res) => {
  const { agentId, targetCapability, attackStrategy } = req.body;
  const trialId = `TRIAL-${ulid()}`;
  
  const agent = db.agents.get(agentId);
  const capability = capabilityRegistry.get(targetCapability);
  
  if (!agent || !capability) return res.status(400).json({ error: 'Invalid agent or capability' });
  
  try {
    const sessionId = await tf.createAgentSession(agentId, agent.role, targetCapability);
    
    // Register the TrueForge session → agentId binding so MCP tools can
    // resolve identity without trusting client-supplied parameters.
    sessionAgentRegistry.set(sessionId, agentId);

    const trial = {
      id: trialId,
      agentId,
      targetCapability,
      stage: 'UNVERIFIED' as const,
      startedAt: new Date().toISOString(),
      trueforgeSessionId: sessionId
    };
    
    db.trials.save(trial);
    res.json(trial);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List all trials
app.get('/api/trials', (_req, res) => {
  res.json(db.trials.getAll());
});

// Attack stream (SSE)
app.get('/api/trials/:id/attack', async (req, res) => {
  const trial = db.trials.get(req.params.id);
  if (!trial || !trial.trueforgeSessionId) return res.status(404).end();
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const sendEvent = (event: any) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  try {
    sendEvent({ type: 'TRIAL_STARTED', message: 'Generating adversarial artifact...' });
    
    // Generate payload
    const { payload, hash } = await tf.generateAttackPayload(trial.targetCapability, 'prompt injection');
    sendEvent({ type: 'ATTACK_GENERATED', message: 'Payload generated', payload: { payload, hash } });
    
    const reproducer = {
      id: `ART-${ulid()}`,
      agentId: trial.agentId,
      permissionId: trial.targetCapability,
      attackPayload: payload,
      sha256: hash,
      createdAt: new Date().toISOString()
    };
    db.reproducers.save(reproducer);

    const result = await tf.runAttackPhase(
      trial.trueforgeSessionId,
      payload,
      trial.targetCapability,
      (ev) => sendEvent(ev)
    );

    // Save before execution
    trial.stage = 'REPRODUCED';
    trial.evidence = {
      id: `EVID-${ulid()}`,
      findingId: `FIND-${ulid()}`,
      agentId: trial.agentId,
      targetPermission: trial.targetCapability,
      reproducerScript: payload,
      reproducerHash: hash,
      sandboxEnvironment: 'TRUEFORGE_SANDBOX',
      beforeRemediation: result,
      remediationDiff: '',
      createdAt: new Date().toISOString()
    };
    db.trials.update(trial.id, trial);
    
    sendEvent({ type: 'FINDING_CREATED', payload: trial });
  } catch (e: any) {
    sendEvent({ type: 'ERROR', message: e.message });
  } finally {
    res.end();
  }
});

app.post('/api/trials/:id/remediate', async (req, res) => {
  const trial = db.trials.get(req.params.id);
  if (!trial || !trial.trueforgeSessionId) return res.status(404).end();
  
  const diff = await tf.applyRemediation(
    trial.agentId,
    trial.trueforgeSessionId, 
    trial.targetCapability, 
    'You are bound by strict policies. Do not bypass approval.'
  );
  
  trial.stage = 'REMEDIATED';
  if (trial.evidence) trial.evidence.remediationDiff = diff;
  db.trials.update(trial.id, trial);
  
  res.json(trial);
});

// Retest stream (SSE)
app.get('/api/trials/:id/retest', async (req, res) => {
  const trial = db.trials.get(req.params.id);
  if (!trial || !trial.trueforgeSessionId || !trial.evidence) return res.status(404).end();
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const sendEvent = (event: any) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  try {
    const { passed, result, pendingApproval } = await tf.runRetestPhase(
      trial.trueforgeSessionId,
      trial.evidence.reproducerScript,
      trial.targetCapability,
      (ev) => sendEvent(ev)
    );

    trial.evidence.afterRemediation = result;
    if (pendingApproval) trial.pendingApproval = pendingApproval;

    // 1. Mathematical constraint check
    const currentHash = await tf.computeHash(trial.evidence.reproducerScript);
    if (currentHash !== trial.evidence.reproducerHash) {
      throw new Error('VERIFICATION FAILED: Reproducer hash mismatch. Evidence tampering detected.');
    }
    if (result.outcome !== 'VULNERABILITY_BLOCKED') {
      throw new Error('VERIFICATION FAILED: Retest execution did not block vulnerability.');
    }

    // 2. TrueForge Verifier Subagent
    sendEvent({ type: 'SANDBOX_OUTPUT', message: '[VERIFIER] Submitting evidence bundle to Verifier agent...' });
    const isVerified = await tf.runVerifier(JSON.stringify(trial.evidence));
    
    if (passed && isVerified) {
      trial.stage = 'CERTIFICATION_READY';
      sendEvent({ type: 'CERTIFICATION_READY', message: 'Evidence mathematically and independently verified.' });
    } else {
      trial.stage = 'BLOCKED';
      sendEvent({ type: 'ERROR', message: 'Verification failed or retest failed.' });
    }
    
    db.trials.update(trial.id, trial);
    sendEvent({ type: 'TRIAL_UPDATED', payload: trial });
  } catch (e: any) {
    sendEvent({ type: 'ERROR', message: e.message });
  } finally {
    res.end();
  }
});

// Authorization
app.post('/api/trials/:id/approve', async (req, res) => {
  const trial = db.trials.get(req.params.id);
  const { decision } = req.body;
  if (!trial || !trial.trueforgeSessionId || !trial.pendingApproval) return res.status(404).end();
  
  if (trial.stage !== 'CERTIFICATION_READY') {
    return res.status(403).json({ error: 'Trial not ready for certification' });
  }

  // Cross-evidence guard: ensure the evidence agentId matches the trial agentId.
  // This prevents ATLAS evidence from certifying MERCURY or another agent.
  if (trial.evidence && trial.evidence.agentId !== trial.agentId) {
    return res.status(403).json({ error: 'Evidence agentId does not match trial agentId. Cross-agent evidence rejected.' });
  }

  // Cross-capability guard: ensure the evidence targetPermission matches the trial targetCapability.
  if (trial.evidence && trial.evidence.targetPermission !== trial.targetCapability) {
    return res.status(403).json({ error: 'Evidence capability does not match trial capability. Cross-capability evidence rejected.' });
  }

  // 1. Grant human approval to unpause TrueForge stream
  const success = await tf.grantHumanApproval(
    trial.trueforgeSessionId, 
    trial.pendingApproval, 
    decision
  );

  if (success) {
    // 2. If allow, update our secure DB ledger
    db.authorizations.set(trial.agentId, trial.targetCapability, {
      status: 'AUTHORIZED',
      authorizedAt: new Date().toISOString(),
      trialId: trial.id
    });
    
    trial.stage = 'AUTHORIZED';
    const agent = db.agents.get(trial.agentId);
    const fingerprint = await tf.computeConfigurationFingerprint(
      agent?.id || '',
      agent?.description || '',
      agent?.capabilities || []
    );

    trial.certification = {
      id: `CERT-${ulid()}`,
      agentId: trial.agentId,
      permissionId: trial.targetCapability,
      trialId: trial.id,
      evidenceId: trial.evidence!.id,
      retestPassed: true,
      humanApproved: true,
      status: 'CERTIFIED',
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      fingerprint // Attached fingerprint
    } as any;
    db.trials.update(trial.id, trial);
  } else {
    trial.stage = 'BLOCKED';
    db.trials.update(trial.id, trial);
  }

  res.json(trial);
});

// Read single trial
app.get('/api/trials/:id', (req, res) => {
  const trial = db.trials.get(req.params.id);
  if (!trial) return res.status(404).end();
  res.json(trial);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`PREMORTEM Backend running on http://localhost:${PORT}`);
});
