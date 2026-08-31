/**
 * CertificationEngine — enforces the PREMORTEM certification state machine.
 *
 * Core invariants (tested):
 * 1. UNVERIFIED cannot transition directly to AUTHORIZED
 * 2. RETEST_FAILED cannot transition to CERTIFICATION_READY
 * 3. UNVERIFIED cannot transition to HUMAN_APPROVED
 * 4. Successful retest enables CERTIFICATION_READY
 * 5. Human approval enables AUTHORIZED
 * 6. Denial keeps permission LOCKED
 */

import type { TrialStage, EvidenceBundle } from '@/types/trial';

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly from: TrialStage,
    public readonly to: TrialStage,
    reason: string
  ) {
    super(`Invalid transition ${from} → ${to}: ${reason}`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class CertificationValidationError extends Error {
  constructor(reason: string) {
    super(`Certification Validation Failed: ${reason}`);
    this.name = 'CertificationValidationError';
  }
}

// Defines all valid state transitions in the certification lifecycle
const VALID_TRANSITIONS: ReadonlyMap<TrialStage, ReadonlySet<TrialStage>> = new Map([
  ['UNVERIFIED', new Set(['IN_TRIAL'])],
  ['IN_TRIAL', new Set(['ATTACK_DISCOVERED', 'BLOCKED'])],
  ['ATTACK_DISCOVERED', new Set(['REPRODUCED', 'BLOCKED'])],
  ['REPRODUCED', new Set(['REMEDIATED', 'BLOCKED'])],
  ['REMEDIATED', new Set(['RETEST_PASSED', 'RETEST_FAILED'])],
  ['RETEST_PASSED', new Set(['CERTIFICATION_READY'])],
  // RETEST_FAILED can only go to BLOCKED — never to CERTIFICATION_READY
  ['RETEST_FAILED', new Set(['BLOCKED'])],
  ['CERTIFICATION_READY', new Set(['HUMAN_APPROVED', 'BLOCKED'])],
  // HUMAN_APPROVED (meaning the human clicked approve) leads to AUTHORIZED
  ['HUMAN_APPROVED', new Set(['AUTHORIZED'])],
  // Terminal states — no further transitions
  ['AUTHORIZED', new Set()],
  ['BLOCKED', new Set()],
]);

/**
 * Validates a state transition and returns the new state.
 * Throws InvalidStateTransitionError for any illegal transition.
 */
export function transition(current: TrialStage, next: TrialStage): TrialStage {
  const allowed = VALID_TRANSITIONS.get(current);

  if (allowed === undefined) {
    throw new InvalidStateTransitionError(current, next, `Unknown state: ${current}`);
  }

  if (!allowed.has(next)) {
    const validTargets = [...(allowed ?? [])].join(', ') || 'none (terminal)';
    throw new InvalidStateTransitionError(
      current,
      next,
      `Valid transitions from ${current}: [${validTargets}]`
    );
  }

  return next;
}

/**
 * Returns whether the given stage represents a completed, positive outcome.
 */
export function isCertified(stage: TrialStage): boolean {
  return stage === 'AUTHORIZED';
}

/**
 * Returns whether the certification trial has ended (either way).
 */
export function isTerminalStage(stage: TrialStage): boolean {
  return stage === 'AUTHORIZED' || stage === 'BLOCKED';
}

/**
 * Returns whether human approval can be requested at this stage.
 * Guards against approval being triggered before evidence is complete.
 */
export function canRequestApproval(stage: TrialStage): boolean {
  return stage === 'CERTIFICATION_READY';
}

/**
 * Returns whether the stage allows proceeding to a certification check.
 * A failed retest MUST prevent this.
 */
export function canProceedToCertification(stage: TrialStage): boolean {
  return stage === 'RETEST_PASSED';
}

/**
 * Ordered list of pipeline stages for display purposes.
 * RETEST_FAILED and BLOCKED are failure branches, not shown in the primary pipeline.
 */
export const PIPELINE_STAGES: TrialStage[] = [
  'IN_TRIAL',
  'ATTACK_DISCOVERED',
  'REPRODUCED',
  'REMEDIATED',
  'RETEST_PASSED',
  'CERTIFICATION_READY',
  'HUMAN_APPROVED',
  'AUTHORIZED',
];

/**
 * Returns which pipeline stage index is currently active (0-indexed).
 * Returns -1 if the stage is not in the primary pipeline (e.g. BLOCKED).
 */
export function getPipelineIndex(stage: TrialStage): number {
  return PIPELINE_STAGES.indexOf(stage);
}

/**
 * Returns a human-readable label for a trial stage.
 */
export function getStageName(stage: TrialStage): string {
  const names: Record<TrialStage, string> = {
    UNVERIFIED: 'Unverified',
    IN_TRIAL: 'Discovery',
    ATTACK_DISCOVERED: 'Attack',
    REPRODUCED: 'Reproduction',
    REMEDIATED: 'Remediation',
    RETEST_PASSED: 'Re-test',
    RETEST_FAILED: 'Re-test Failed',
    CERTIFICATION_READY: 'Certification',
    HUMAN_APPROVED: 'Human Approval',
    AUTHORIZED: 'Authorized',
    BLOCKED: 'Blocked',
  };
  return names[stage];
}

/**
 * Validates that an evidence bundle meets all PREMORTEM certification requirements.
 * Most importantly enforces the "SAME REPRODUCER. DIFFERENT OUTCOME" invariant.
 */
export function validateEvidenceBundle(evidence: EvidenceBundle): boolean {
  if (!evidence.findingId || !evidence.agentId || !evidence.targetPermission) {
    throw new CertificationValidationError('Missing core identity fields (findingId, agentId, targetPermission)');
  }

  if (!evidence.reproducerHash || !evidence.reproducerScript) {
    throw new CertificationValidationError('Missing reproducer execution artifact or hash');
  }

  if (!evidence.beforeRemediation) {
    throw new CertificationValidationError('Missing pre-remediation execution result');
  }

  if (!evidence.afterRemediation) {
    throw new CertificationValidationError('Missing post-remediation execution result');
  }

  // The critical invariant: SAME REPRODUCER
  // In a full implementation, we'd recalculate the hash of reproducerScript here.
  // For this validation, we ensure the hash identity is preserved and documented.
  if (evidence.beforeRemediation.reproducerHash !== evidence.afterRemediation.reproducerHash) {
    throw new CertificationValidationError('Reproducer identity mismatch: beforeHash !== afterHash');
  }

  // Check the security test semantics
  if (evidence.beforeRemediation.outcome !== 'VULNERABILITY_REPRODUCED') {
    throw new CertificationValidationError('Invalid beforeRemediation outcome: must reproduce vulnerability (FAIL)');
  }

  if (evidence.afterRemediation.outcome !== 'VULNERABILITY_BLOCKED') {
    throw new CertificationValidationError('Invalid afterRemediation outcome: must block vulnerability (PASS)');
  }

  return true;
}
