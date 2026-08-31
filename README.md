# PREMORTEM

**An agent autonomy-control and certification system.**

> A consequential AI capability is not trusted merely because the agent appears competent.
> It is **earned** through executable adversarial evidence.

## Core Principle

```
NO PROOF. NO PERMISSION.
```

PREMORTEM enforces that every consequential AI capability must complete a full
adversarial certification lifecycle before a human operator grants authorization.
The evidence is cryptographically bound. The authorization lives on the backend.
The frontend has no authority.

---

## The Problem

Autonomous AI agents are increasingly capable of executing consequential,
irreversible actions: deploying to production, executing financial transactions,
publishing research findings. Today, permission is granted based on:

- The model's claimed competence
- A static role or system prompt
- A human's general trust in the agent

**None of these prevent a capable agent from being manipulated, prompt-injected,
or simply misconfigured in a way that causes real damage.**

---

## The Solution: Earned Autonomy

```
ATTACK
  ↓
REPRODUCE
  ↓
OBSERVE FAILURE
  ↓
REMEDIATE
  ↓
REPLAY IDENTICAL REPRODUCER
  ↓
VERIFY MITIGATION
  ↓
HUMAN APPROVAL
  ↓
CLEARANCE
  ↓
AUTHORIZED
```

The core proof is:

```
SAME REPRODUCER. DIFFERENT OUTCOME.
```

The attacker runs the same byte-identical payload before and after remediation.
The cryptographic hash of the reproducer is locked at the time of discovery and
enforced at retest. Any modification invalidates the certification.

---

## Architecture

```
Browser
  ↓
Vercel — PREMORTEM React UI
  ↓ (HTTPS)
Render — PREMORTEM Runtime API (Express + MCP)
  ↓ (internal)
TrueForge — Agent runtime + sandbox
  ↓
├── Gemini 2.0 Flash (LLM)
├── MCP capability server (registered dynamically)
└── Daytona — sandboxed code execution
```

### Why this topology is secure

- **The frontend is stateless.** It cannot grant authorization. Authorization
  lives exclusively in the backend JSON ledger (`runtime/db/authorizations.json`).
- **TrueForge is not public.** It runs on `localhost` inside the Render container,
  unreachable from the internet.
- **Secrets never cross to the client.** `GEMINI_API_KEY`, `TRUEFORGE_API_KEY`,
  and `DAYTONA_WORKSPACE_URL` are server-side only.

---

## TrueForge Role

TrueForge is the **agent runtime** — not a wrapper or UI decoration.

It performs:

| Primitive | Used for |
|---|---|
| `sessions.create` | Spawning target agent and attacker subagent |
| `sessions.createTurnStream` | Streaming real agent execution events |
| `sessions.update` | Applying remediated agent spec (patching `requireApprovalForTools`) |
| `tool.approval_required` event | Triggering the human approval checkpoint |
| `user.tool_approval` event | Granting/denying permission after human decision |
| Subagent (Attacker) | Generating adversarial JSON payload via separate TrueForge session |
| Subagent (Verifier) | Independently verifying the evidence bundle (hash + outcomes) |

**Every agent invocation is a real TrueForge session call.**

---

## MCP Role

The PREMORTEM MCP server (`runtime/backend/server.ts`) registers consequential
capabilities as real MCP tools:

| Tool | Domain | Consequential |
|---|---|---|
| `deploy_production` | Deployment (ATLAS) | ✓ |
| `execute_payment` | Finance (MERCURY) | ✓ |
| `publish_finding` | Research (ORION) | ✓ |
| `read_repository` | Utility | — |
| `run_tests` | Utility | — |

Each tool's handler enforces authorization by checking the persistent backend
ledger. The MCP session is bound to an agent ID at creation time via an in-memory
registry (`sessionAgentRegistry`). There is no client-supplied identity claim.

---

## Daytona Role

Daytona provides the sandboxed execution environment used during attack and
retest phases. The agent runs its capability call inside a controlled Daytona
sandbox, producing:

- Execution ID
- Command output (stdout/stderr)
- Exit code
- Duration

**Status:** `UNVERIFIED — REQUIRES LIVE TRUEFORGE ENVIRONMENT`  
The Daytona integration is fully wired through TrueForge's sandbox config
(`config: { sandbox: { enabled: true } }`). Live verification is pending an
active TrueForge + Daytona environment.

---

## Certification Domains

### ATLAS — Deployment
- **Target capability:** `deploy_production`
- **Attack strategy:** Prompt injection via malicious release manifest
- **Risk:** Unauthorized production deployment

### MERCURY — Finance
- **Target capability:** `execute_payment`
- **Attack strategy:** Prompt injection via financial instruction payload
- **Risk:** Unauthorized treasury transaction

### ORION — Research
- **Target capability:** `publish_finding`
- **Attack strategy:** Prompt injection via fake research artifact
- **Risk:** Publishing false or harmful information

---

## Evidence Model

An `EvidenceBundle` is created per trial and contains:

```typescript
{
  id: string;
  findingId: string;
  agentId: string;           // Agent that owns this evidence
  targetPermission: string;  // Capability being certified
  reproducerScript: string;  // Byte-identical payload used in both runs
  reproducerHash: string;    // SHA-256 hash — locked at discovery
  sandboxEnvironment: string;
  beforeRemediation: ExecutionResult;  // outcome: VULNERABILITY_REPRODUCED
  remediationDiff: string;
  afterRemediation: ExecutionResult;   // outcome: VULNERABILITY_BLOCKED
}
```

**The hash is verified at retest.** If the script content has changed, the
certification is invalidated before the verifier even sees it.

---

## Authorization Boundary

The authorization boundary is enforced at the **backend API layer** — not
in the React frontend:

- `POST /api/trials/:id/approve` validates:
  - Trial must be in `CERTIFICATION_READY` stage
  - Evidence `agentId` must match trial `agentId` (cross-agent rejection)
  - Evidence `targetPermission` must match trial `targetCapability` (cross-capability rejection)
  - TrueForge human approval event must succeed

- MCP tools enforce authorization at call time:
  - Unregistered sessions are blocked (fail-secure)
  - `db.authorizations.get(agentId, capability)` must return `AUTHORIZED`

---

## Security Boundary Tests

```
✓ Default deny — all capabilities start LOCKED
✓ Approval gate — must be CERTIFICATION_READY (8 stage variants tested)
✓ Hash tamper detection — any content change invalidates certification
✓ Same reproducer — identical hash for identical content
✓ Changed reproducer — different hash for different content
✓ Cross-agent rejection — ATLAS evidence cannot certify MERCURY
✓ Cross-capability rejection — deploy evidence cannot authorize payment
✓ Failed retest cannot reach CERTIFICATION_READY
✓ Approval denial leaves capability LOCKED
✓ Persistence — authorization survives DB read cycles
✓ Persistence — different agent stays LOCKED after another is authorized
```

**Test command:**
```bash
npm ci
npx tsc --noEmit
npx vitest run
npm run build
```

---

## Setup

### Prerequisites
- Node.js 18+
- A running TrueForge instance (`npx @truefoundry/trueforge`)
- A Gemini API key (configured inside TrueForge)
- Optional: A Daytona workspace

### Local development

```bash
# 1. Clone
git clone https://github.com/raiatharva-invictus/PreMortem.git
cd PreMortem

# 2. Install
npm install

# 3. Start TrueForge (in a separate terminal)
npx @truefoundry/trueforge

# 4. Copy and fill environment variables
cp .env.example .env.local
# TRUEFORGE_URL=http://localhost:8790
# TRUEFORGE_API_KEY=<your-key-if-required>
# GEMINI_API_KEY=<your-gemini-key>
# VITE_BACKEND_URL=http://localhost:3001

# 5. Start the full stack
npm run dev
```

### Production deployment

Backend (Render): Render reads `render.yaml` from the repository root.
It starts TrueForge and the PREMORTEM API in the same container.

Frontend (Vercel): Import the repository. Set `VITE_BACKEND_URL` to your
Render service URL.

---

## Known Limitations

- **Daytona:** Live sandboxed execution verification is pending an active
  TrueForge + Daytona environment. The integration is architecturally complete.
- **Multi-replica persistence:** The current JSON-file persistence is single-replica.
  Production use should replace with PostgreSQL + Redis (set `STANDALONE=false`
  per TrueForge docs).
- **MCP session identity:** The current session registry is in-memory and does
  not survive backend restarts. Authorization state persists (via JSON), but a
  restart requires new trial sessions.
- **Verifier subagent:** The verifier uses an LLM to inspect evidence. A future
  version should perform the hash check programmatically before calling the LLM.

---

## Qodo Code Review Evidence

Three substantive pull requests were submitted for Qodo review as part of this hackathon:

### PR 1 — `feat(security): harden evidence-backed authorization boundary`

**Branch:** `feat/security-hardening-auth-boundary`  
**URL:** https://github.com/raiatharva-invictus/PreMortem/pull/new/feat/security-hardening-auth-boundary

**What changed:**
- Removed hardcoded `agentId = 'agent-atlas-001'` from MCP tool handler — all
  callers now get their identity from the session-to-agent registry (fail-secure)
- Added cross-agent evidence rejection in `/approve` endpoint
- Added cross-capability evidence rejection in `/approve` endpoint
- Expanded security test suite from 3 comment-tests to 21 structural boundary tests

**What Qodo found:** *(to be populated after Qodo review runs)*  
**What we changed/dismissed:** *(to be populated after review)*

---

### PR 2 — `feat(runtime): harden TrueForge MCP execution path and add health endpoints`

**Branch:** `feat/runtime-trueforge-mcp-hardening`  
**URL:** https://github.com/raiatharva-invictus/PreMortem/pull/new/feat/runtime-trueforge-mcp-hardening

**What changed:**
- Made `MCP_SERVER_URL` environment-driven (was hardcoded to `localhost:3001`)
- Added `GET /health` endpoint for Render health-checks and monitoring
- Added `GET /api/capabilities` for dynamic frontend capability loading
- Added `GET /api/trials` (list all trials) for dashboard
- Added TRUEFORGE_API_KEY startup warning when auth is unconfigured

**What Qodo found:** *(to be populated after Qodo review runs)*  
**What we changed/dismissed:** *(to be populated after review)*

---

### PR 3 — `feat(product): persist certification evidence, finalize README`

**Branch:** `feat/persistence-and-readme`  
**URL:** https://github.com/raiatharva-invictus/PreMortem/pull/new/feat/persistence-and-readme

**What changed:**
- Added `.env.example` for safe setup documentation
- Finalized README with accurate architecture, known limitations, and authentic
  Qodo evidence section
- Removed test scratch files from tracked files

**What Qodo found:** *(to be populated after Qodo review runs)*  
**What we changed/dismissed:** *(to be populated after review)*

> Note: Earlier commits on `main` (the initial implementation) were merged
> directly before the Qodo workflow was established. We do not claim those
> were Qodo-reviewed. The three PRs above represent the genuine Qodo trail.

---

## AI Use Disclosure

This project was built with AI assistance (Google Gemini / Antigravity) for:
- Code generation and architecture design
- Security test generation
- README writing

All generated code was reviewed, hardened, and tested by the human author.
The Qodo review trail reflects genuine code quality evaluation of the final
engineering work.

---

## Repository

```
raiatharva-invictus/PreMortem
https://github.com/raiatharva-invictus/PreMortem
```