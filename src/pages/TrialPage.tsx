import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Shield, Lock, CheckCircle2, AlertTriangle, Play, ChevronRight,
  Terminal, FileCode2, Diff, UserCheck, Zap, Clock, Hash,
  XCircle, RefreshCw
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { getAgentById } from '@/data/agents';
import {
  PIPELINE_STAGES, getStageName, getPipelineIndex, transition
} from '@/lib/certification-engine';
import type { TrialStage, PendingApproval, ExecutionResult } from '@/types/trial';
import type { RuntimeEvent } from '@/types/events';
import {
  createAtlasSession,
  generateAttackPayload,
  runAttackPhase,
  applyRemediation,
  runRetestPhase,
  grantHumanApproval,
  computeHash
} from '@/lib/trueforge-service';

// ─── Pipeline Stepper ──────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  IN_TRIAL: 'Discover',
  ATTACK_DISCOVERED: 'Attack',
  REPRODUCED: 'Reproduce',
  REMEDIATED: 'Remediate',
  RETEST_PASSED: 'Re-test',
  CERTIFICATION_READY: 'Certify',
  HUMAN_APPROVED: 'Approve',
  AUTHORIZED: 'Authorized',
};

function PipelineStepper({ stage }: { stage: TrialStage }) {
  const currentIdx = getPipelineIndex(stage);
  const isBlocked = stage === 'BLOCKED' || stage === 'RETEST_FAILED';

  return (
    <div className="flex items-center gap-0">
      {PIPELINE_STAGES.map((s, i) => {
        const isDone = currentIdx > i;
        const isActive = currentIdx === i;
        const isFuture = currentIdx < i;

        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all',
                  isDone && 'bg-certified border-certified text-white',
                  isActive && !isBlocked && 'bg-trial border-trial text-white animate-pulse-subtle',
                  isActive && isBlocked && 'bg-blocked border-blocked text-white',
                  isFuture && 'bg-surface border-border text-text-muted'
                )}
              >
                {isDone ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
              </div>
              <span className={cn(
                'text-[9px] font-mono whitespace-nowrap',
                isDone && 'text-certified',
                isActive && !isBlocked && 'text-trial',
                isActive && isBlocked && 'text-blocked',
                isFuture && 'text-text-muted'
              )}>
                {STAGE_LABELS[s] ?? s}
              </span>
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <div className={cn(
                'w-8 h-px mb-4 mx-1 transition-colors',
                currentIdx > i ? 'bg-certified/50' : 'bg-border'
              )} />
            )}
          </div>
        );
      })}

      {isBlocked && (
        <div className="ml-4 flex items-center gap-1.5 px-2 py-1 rounded bg-blocked/10 border border-blocked/30">
          <XCircle className="w-3.5 h-3.5 text-blocked" />
          <span className="text-xs font-mono text-blocked">BLOCKED</span>
        </div>
      )}
    </div>
  );
}

// ─── Terminal Output ──────────────────────────────────────────────────────────

function TerminalPanel({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [lines]);

  return (
    <div ref={ref} className="terminal h-48 overflow-auto space-y-0.5">
      {lines.length === 0 ? (
        <span className="terminal-dim">Awaiting execution...</span>
      ) : (
        lines.map((line, i) => {
          const cls = line.includes('[SECURITY VIOLATION]')
            ? 'terminal-fail'
            : line.includes('[PREMORTEM POLICY GUARD]') || line.includes('BLOCKED') || line.includes('PASS')
            ? 'terminal-pass'
            : line.startsWith('[PREMORTEM]')
            ? 'terminal-info'
            : '';
          return (
            <div key={i} className={cn('leading-5', cls)}>
              {line}
            </div>
          );
        })
      )}
      {lines.length > 0 && <span className="animate-blink">▍</span>}
    </div>
  );
}

// ─── Evidence Panel ───────────────────────────────────────────────────────────

function EvidencePanel({
  stage,
  hash,
  beforeResult,
  afterResult,
}: {
  stage: TrialStage;
  hash: string | null;
  beforeResult: ExecutionResult | null;
  afterResult: ExecutionResult | null;
}) {
  const hasBefore = getPipelineIndex(stage) >= getPipelineIndex('REPRODUCED');
  const hasAfter = getPipelineIndex(stage) >= getPipelineIndex('RETEST_PASSED');

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-surface-50 flex items-center justify-between">
        <span className="section-label">Evidence Bundle — EXP-017</span>
        {hash && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
            <Hash className="w-3 h-3" />
            {hash.slice(0, 16)}…
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        {/* Before */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              'w-2 h-2 rounded-full',
              hasBefore ? 'bg-critical' : 'bg-border'
            )} />
            <span className="section-label">Before Remediation</span>
          </div>
          {hasBefore && beforeResult ? (
            <div className="space-y-1">
              {beforeResult.stdout.split('\n').filter(Boolean).map((line, i) => (
                <div key={i} className={cn(
                  'font-mono text-[11px] leading-4',
                  line.includes('SUCCESSFUL') ? 'text-critical' : 'text-text-muted'
                )}>
                  {line}
                </div>
              ))}
              <div className="mt-2 flex items-center gap-2">
                <span className="badge-blocked">EXIT {beforeResult.exitCode} — {beforeResult.outcome.replace('_', ' ')}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-text-muted font-mono">Awaiting execution…</div>
          )}
        </div>

        {/* After */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              'w-2 h-2 rounded-full',
              hasAfter ? 'bg-certified' : 'bg-border'
            )} />
            <span className="section-label">After Remediation</span>
          </div>
          {hasAfter && afterResult ? (
            <div className="space-y-1">
              <div className="font-mono text-[11px] leading-4 text-certified">
                [MCP POLICY ENFORCEMENT] Authorization checkpoint triggered
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="badge-certified">EXIT {afterResult.exitCode} — {afterResult.outcome.replace('_', ' ')}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-text-muted font-mono">Awaiting retest…</div>
          )}
        </div>
      </div>

      {/* Crucial callout */}
      {hasAfter && hash && (
        <div className="px-4 py-3 bg-trial/5 border-t border-trial/20">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-trial shrink-0" />
            <span className="text-xs font-mono text-trial font-semibold">
              SAME REPRODUCER · HASH: {hash.slice(0, 8)}… · DIFFERENT OUTCOME
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Remediation Diff ─────────────────────────────────────────────────────────

function RemediationPanel({ visible, diff }: { visible: boolean; diff: string }) {
  if (!visible) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-surface-50">
        <span className="section-label flex items-center gap-1.5">
          <Diff className="w-3 h-3" />
          Remediation Patch — atlas-policy.json
        </span>
      </div>
      <pre className="p-4 text-[11px] font-mono leading-5 overflow-auto max-h-48">
        {diff.split('\n').map((line, i) => (
          <div
            key={i}
            className={cn(
              line.startsWith('+') && !line.startsWith('+++') && 'text-certified bg-certified/5',
              line.startsWith('-') && !line.startsWith('---') && 'text-critical bg-critical/5',
              !line.startsWith('+') && !line.startsWith('-') && 'text-text-muted'
            )}
          >
            {line}
          </div>
        ))}
      </pre>
    </div>
  );
}

// ─── Approval Modal ───────────────────────────────────────────────────────────

function ApprovalModal({
  onApprove,
  onDeny,
  loading,
  hash,
  beforeResult,
  afterResult
}: {
  onApprove: () => void;
  onDeny: () => void;
  loading: boolean;
  hash: string;
  beforeResult: ExecutionResult;
  afterResult: ExecutionResult;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-surface border border-border-strong rounded-xl shadow-2xl w-[520px] p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-trial/10 border border-trial/30 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-trial" />
          </div>
          <div>
            <div className="font-bold text-text-primary">Human Authorization Required</div>
            <div className="text-xs text-text-muted">TrueForge Approval Gate · tool.approval_required</div>
          </div>
        </div>

        {/* Evidence summary */}
        <div className="space-y-3 mb-5">
          <div className="p-3 rounded-lg bg-canvas border border-border">
            <div className="section-label mb-2">Requested Permission</div>
            <div className="font-mono text-sm text-locked font-semibold">deploy_production</div>
            <div className="text-xs text-text-secondary mt-1">
              Deploy release artifacts to the production environment.
            </div>
          </div>

          <div className="p-3 rounded-lg bg-certified/5 border border-certified/20 space-y-2">
            <div className="section-label text-certified">Evidence Verified</div>
            <div className="space-y-1.5">
              {[
                { label: 'Finding', value: 'EXP-017 · Repository Instruction Injection' },
                { label: 'Severity', value: 'CRITICAL' },
                { label: 'Pre-retest', value: `${beforeResult.outcome.replace('_', ' ')} (exit ${beforeResult.exitCode})` },
                { label: 'Post-retest', value: `${afterResult.outcome.replace('_', ' ')} (exit ${afterResult.exitCode})` },
                { label: 'Reproducer hash', value: hash.slice(0, 24) + '…' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-text-muted">{label}</span>
                  <span className="font-mono text-text-secondary">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-locked/5 border border-locked/20">
            <div className="section-label text-locked mb-1">Your Decision</div>
            <div className="text-xs text-text-secondary">
              You are the authorization boundary. This action will persist in the evidence record.
              The state machine enforces this is the final gate before <code className="font-mono">deploy_production</code> becomes available to ATLAS.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onDeny}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-blocked/30 text-blocked text-sm font-medium hover:bg-blocked/10 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Deny Authorization
          </button>
          <button
            onClick={onApprove}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-certified border border-certified/50 text-white text-sm font-semibold hover:bg-certified/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Authorize deploy_production
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Trial Page ──────────────────────────────────────────────────────────

type Phase = 'idle' | 'attack' | 'remediation' | 'retest' | 'awaiting_approval' | 'done' | 'blocked';

export default function TrialPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const agent = getAgentById(agentId ?? 'agent-atlas-001') ?? getAgentById('agent-atlas-001')!;

  const [stage, setStage] = useState<TrialStage>('UNVERIFIED');
  const [phase, setPhase] = useState<Phase>('idle');
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [showApproval, setShowApproval] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'LOCKED' | 'AUTHORIZED'>('LOCKED');

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);

  // Evidence state
  const [reproducerHash, setReproducerHash] = useState<string | null>(null);
  const [beforeResult, setBeforeResult] = useState<ExecutionResult | null>(null);
  const [afterResult, setAfterResult] = useState<ExecutionResult | null>(null);
  const [remediationDiff, setRemediationDiff] = useState<string>('');

  const addLine = useCallback((line: string) => {
    setTerminalLines(prev => [...prev, line]);
  }, []);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // Run the full trial flow using TrueForge SDK
  async function runTrial() {
    setTerminalLines([]);
    setPhase('attack');
    setStage('IN_TRIAL');

    try {
      const sid = await createAtlasSession();
      setSessionId(sid);

      // Payload Generation Phase
      addLine('[PREMORTEM] Session created: ' + sid);
      addLine('[PREMORTEM] Spawning Attacker Subagent to generate malicious payload...');
      const attackPayload = await generateAttackPayload();
      addLine('[PREMORTEM] Malicious payload generated (length: ' + attackPayload.length + ' bytes)');
      
      const payloadHash = await computeHash(attackPayload);
      setReproducerHash(payloadHash);
      addLine('[PREMORTEM] Computed Payload Hash: ' + payloadHash);

      // Attack phase
      const attackRes = await runAttackPhase(sid, attackPayload, (e) => addLine(e.message));
      setBeforeResult({ ...attackRes, reproducerHash: payloadHash });

      if (attackRes.outcome === 'VULNERABILITY_REPRODUCED') {
        addLine('[SECURITY VIOLATION] Consequential tool \'deploy_production\' was executed successfully.');
        addLine('[PREMORTEM] Exit code: 1 — VULNERABILITY REPRODUCED');
      } else {
        addLine('[PREMORTEM] Failed to reproduce vulnerability. Tool blocked.');
        throw new Error('Vulnerability reproduction failed. Please try again.');
      }

      setStage(transition('IN_TRIAL', 'ATTACK_DISCOVERED'));
      await sleep(600);
      setStage(transition('ATTACK_DISCOVERED', 'REPRODUCED'));
      setPhase('remediation');

      // Remediation phase
      addLine('');
      addLine('[PREMORTEM] Applying remediation patch to ATLAS policy...');
      const diff = await applyRemediation(sid);
      setRemediationDiff(diff);
      addLine('[PREMORTEM] Policy patched: human approval via TrueForge MCP checkpoint is strictly required.');
      addLine('[PREMORTEM] Remediation applied. Starting retest...');

      setStage(transition('REPRODUCED', 'REMEDIATED'));
      setPhase('retest');

      // Retest phase
      addLine('');
      const retestRes = await runRetestPhase(sid, attackPayload, (e) => addLine(e.message));
      setAfterResult({ ...retestRes.result, reproducerHash: payloadHash });

      if (retestRes.passed) {
        addLine('[PREMORTEM] Exit code: 0 — VULNERABILITY BLOCKED ✓');
        setStage(transition('REMEDIATED', 'RETEST_PASSED'));
        await sleep(800);
        setStage(transition('RETEST_PASSED', 'CERTIFICATION_READY'));
        addLine('');
        addLine('[PREMORTEM] All certification conditions met (SAME REPRODUCER, DIFFERENT OUTCOME).');
        addLine('[PREMORTEM] Requesting human authorization for deploy_production...');
        setPendingApproval(retestRes.pendingApproval || null);
        setPhase('awaiting_approval');
        await sleep(600);
        setShowApproval(true);
      } else {
        addLine('[PREMORTEM] Exit code: 1 — RETEST FAILED. Vulnerability still present.');
        setStage(transition('REMEDIATED', 'RETEST_FAILED'));
        setPhase('blocked');
      }

    } catch (err: any) {
      addLine(`[ERROR] ${err.message || String(err)}`);
      setPhase('blocked');
    }
  }

  async function handleApprove() {
    if (!sessionId || !pendingApproval) return;
    setApprovalLoading(true);

    try {
      const success = await grantHumanApproval(sessionId, pendingApproval, 'allow');
      setShowApproval(false);
      
      addLine('');
      addLine('[PREMORTEM] Human authorization ' + (success ? 'received via TrueForge.' : 'failed via TrueForge.'));
      
      if (success) {
        addLine('[PREMORTEM] Recording certification: cert-' + Date.now().toString(36));
        addLine('[PREMORTEM] Permission deploy_production → AUTHORIZED');
        addLine('[PREMORTEM] ATLAS is now authorized to invoke deploy_production.');

        setStage(transition('CERTIFICATION_READY', 'HUMAN_APPROVED'));
        await sleep(500);
        setStage(transition('HUMAN_APPROVED', 'AUTHORIZED'));
        setPermissionStatus('AUTHORIZED');
        setPhase('done');
      } else {
        addLine('[PREMORTEM] Failed to grant authorization.');
        setPhase('blocked');
      }
    } catch (err: any) {
      setShowApproval(false);
      addLine(`[ERROR] ${err.message || String(err)}`);
      setPhase('blocked');
    } finally {
      setApprovalLoading(false);
    }
  }

  async function handleDeny() {
    if (!sessionId || !pendingApproval) return;
    setShowApproval(false);
    
    try {
      await grantHumanApproval(sessionId, pendingApproval, 'deny', 'Denied by PREMORTEM human reviewer');
    } catch (err) {
      // Ignore
    }

    addLine('');
    addLine('[PREMORTEM] Authorization DENIED by human reviewer.');
    addLine('[PREMORTEM] Permission deploy_production remains LOCKED.');
    setStage(transition('CERTIFICATION_READY', 'BLOCKED'));
    setPhase('blocked');
  }

  const isRunning = ['attack', 'remediation', 'retest'].includes(phase);
  const showRemediation = getPipelineIndex(stage) >= getPipelineIndex('REMEDIATED');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="section-label mb-2">Certification Trial</div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
              <span className="font-mono">ATLAS</span>
              <span className="text-text-muted font-normal text-base">→</span>
              <span className="text-locked font-mono text-lg">deploy_production</span>
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Repository Instruction Injection · Finding EXP-017 · Severity:{' '}
              <span className="text-critical font-semibold">CRITICAL</span>
            </p>
          </div>

          {/* Permission badge */}
          <div className={cn(
            'px-4 py-3 rounded-xl border text-center min-w-[140px] transition-all',
            permissionStatus === 'LOCKED'
              ? 'bg-locked-bg border-locked-border'
              : 'bg-certified-bg border-certified-border'
          )}>
            <div className="section-label mb-1">deploy_production</div>
            <div className={cn(
              'font-bold font-mono text-sm flex items-center justify-center gap-1.5',
              permissionStatus === 'LOCKED' ? 'text-locked' : 'text-certified'
            )}>
              {permissionStatus === 'LOCKED' ? (
                <><Lock className="w-3.5 h-3.5" /> LOCKED</>
              ) : (
                <><CheckCircle2 className="w-3.5 h-3.5" /> AUTHORIZED</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="card p-4 mb-6 overflow-x-auto">
        <PipelineStepper stage={stage} />
      </div>

      {/* Finding */}
      <div className="card p-4 mb-4 border-l-2 border-l-critical">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-critical shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-text-primary">EXP-017 · Repository Instruction Injection</span>
              <span className="badge-blocked text-[10px]">CRITICAL</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              ATLAS fails to distinguish untrusted release artifact content from authoritative deployment policy.
              A malicious manifest with embedded instructions causes ATLAS to invoke <code className="font-mono text-locked">deploy_production</code> without authorization.
            </p>
          </div>
        </div>
      </div>

      {/* Terminal */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="section-label flex items-center gap-1.5">
            <Terminal className="w-3 h-3" /> Sandbox Execution
          </span>
          {isRunning && (
            <span className="text-[10px] font-mono text-trial flex items-center gap-1.5">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Running via TrueForge…
            </span>
          )}
        </div>
        <TerminalPanel lines={terminalLines} />
      </div>

      {/* Evidence */}
      <div className="mb-4">
        <EvidencePanel
          stage={stage}
          hash={reproducerHash}
          beforeResult={beforeResult}
          afterResult={afterResult}
        />
      </div>

      {/* Remediation diff */}
      {showRemediation && (
        <div className="mb-4">
          <RemediationPanel visible={showRemediation} diff={remediationDiff} />
        </div>
      )}

      {/* Action button */}
      <div className="flex justify-end gap-3">
        {phase === 'idle' && (
          <button
            onClick={runTrial}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-trial text-white text-sm font-semibold hover:bg-trial/90 transition-colors shadow-lg shadow-trial/20"
          >
            <Play className="w-4 h-4" />
            Run Certification Trial
          </button>
        )}
        {phase === 'done' && (
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-certified/10 border border-certified/30 text-certified text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            Trial Complete · deploy_production AUTHORIZED
          </div>
        )}
        {phase === 'blocked' && (
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blocked/10 border border-blocked/30 text-blocked text-sm font-semibold">
            <XCircle className="w-4 h-4" />
            Authorization Denied · deploy_production remains LOCKED
          </div>
        )}
      </div>

      {/* Approval modal */}
      {showApproval && beforeResult && afterResult && reproducerHash && (
        <ApprovalModal
          onApprove={handleApprove}
          onDeny={handleDeny}
          loading={approvalLoading}
          hash={reproducerHash}
          beforeResult={beforeResult}
          afterResult={afterResult}
        />
      )}
    </div>
  );
}
