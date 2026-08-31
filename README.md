# PREMORTEM

> **An agent autonomy-control and certification platform for consequential AI capabilities.**

## What problem PREMORTEM solves
As autonomous AI agents gain access to consequential capabilities (e.g., deploying to production, executing financial transactions, publishing research), the traditional model of "trust but verify" breaks down. We cannot simply give an agent a production API key and hope it behaves safely.

PREMORTEM introduces **earned autonomy** through adversarial certification. Before a capability is unlocked for an agent, PREMORTEM forces the agent to survive a simulated attack in a sandbox environment, proves the vulnerability can be exploited, applies a remediation policy, and forces an identical retest to prove the behavior is now blocked.

## Why Earned Autonomy?
No agent should be granted consequential permissions by default. 
PREMORTEM operates on a strict rule: **NO PROOF. NO PERMISSION.**
Permissions are earned only after an adversarial trial produces cryptographic evidence of safe behavior.

## Architecture
PREMORTEM orchestrates:
- **TrueForge**: Provides the core agent runtime, LLM routing (Gemini), and state management.
- **MCP (Model Context Protocol)**: Exposes consequential capabilities to agents in a standardized way.
- **Daytona**: Provides secure sandbox environments for adversarial trials, ensuring zero impact on real production systems.

## Three Domains
PREMORTEM is generalized across three domains:
1. **Deployment & Release (ATLAS)**: Capability `deploy_production`. Mitigates repository instruction injection.
2. **Financial Operations (MERCURY)**: Capability `execute_payment`. Mitigates malicious invoice manipulation.
3. **Research Publication (ORION)**: Capability `publish_finding`. Mitigates untrusted artifact manipulation.

## Custom Cases
PREMORTEM supports custom test cases. Users can supply new test inputs (e.g., a new release artifact, a custom invoice, or a novel research artifact) to prove the certification machinery generalizes beyond pre-defined samples.

## Certification Protocol
1. **Attack Generation**: A TrueForge subagent generates an adversarial payload.
2. **Controlled Execution**: The target agent attempts to execute the capability in a Daytona sandbox.
3. **Evidence Capture**: The result (stdout/stderr/exit code) is recorded.
4. **Remediation**: An updated, safer policy is applied.
5. **Retest**: The **identical reproducer** (verified by SHA-256 hash) is executed again.
6. **Verification**: A verifier agent confirms the vulnerability is blocked.
7. **Human Checkpoint**: A final human approval is required via TrueForge.

## Evidence Model
All trials produce a cryptographic evidence bundle containing:
- Before-execution result
- After-execution result
- Reproducer script and its SHA-256 hash
- Remediation diff
This evidence persists and acts as the foundation for clearance.

## Security Model
- **Independent Authorization**: The backend independently verifies authorization state before executing MCP tools.
- **Mathematical Constraints**: Hashes ensure the retest uses the exact same attack vector.
- **Stateless Resilience**: Refreshing the browser does not alter the backend authorization state.

## Deployment
- **Frontend**: Designed for Vercel.
- **Backend/Runtime**: Designed for Render (with private networking for TrueForge, MCP, and Daytona).

## How to Run Locally
1. Start TrueForge standalone locally on port 8790.
2. Start the PREMORTEM backend:
   ```bash
   cd runtime/backend
   npm run start
   ```
3. Start the PREMORTEM frontend:
   ```bash
   npm run dev
   ```

## How to Test
1. Run the TypeScript compiler: `npx tsc --noEmit`
2. Run the Vitest suite: `npx vitest run` (Includes security negative tests and certification invariants)
3. Open the UI, select a profile, and run a trial.

## Known Limitations
- Daytona sandbox integration requires a properly configured Daytona provider in TrueForge.
- Human approval checkpoints rely on TrueForge's current session approval API.

## Qodo Code Review Evidence
*Note: This section contains genuine PR links and review history.*

### PR 1: Core certification/evidence/security
- **Link**: [Insert PR Link Here]
- **Qodo Findings**: 
- **Fixes Applied**: 
- **Dismissed Findings**: 
- **Merged State**: 

### PR 2: TrueForge/MCP/Daytona runtime
- **Link**: [Insert PR Link Here]
- **Qodo Findings**: 
- **Fixes Applied**: 
- **Dismissed Findings**: 
- **Merged State**: 

### PR 3: Persistence/live evidence/clearance
- **Link**: [Insert PR Link Here]
- **Qodo Findings**: 
- **Fixes Applied**: 
- **Dismissed Findings**: 
- **Merged State**: 

## AI Usage Disclosure
This project was developed with the assistance of an autonomous AI agent for architecture, implementation, and rigorous forensic auditing.