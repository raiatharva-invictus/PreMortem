/**
 * AuthorizationService — manages the consequential permission grant boundary.
 *
 * This service enforces that permission transitions originate from verified
 * evidence + human approval, never from UI state alone.
 *
 * Architecture note: In the full implementation, this calls TrueForge's
 * approval mechanism. The UI reads the resulting state — it does not invent it.
 */

import type { Agent, Permission } from '@/types/agent';
import type { CertificationRecord, Trial } from '@/types/trial';
import type { StreamCallback } from './api';
import { canRequestApproval, isCertified, transition } from './certification-engine';

export class AuthorizationError extends Error {
  constructor(reason: string) {
    super(`Authorization denied: ${reason}`);
    this.name = 'AuthorizationError';
  }
}

/**
 * Validates that all pre-conditions are met before human approval can be requested.
 * Throws AuthorizationError if any condition is unmet.
 */
export function validateApprovalPreconditions(
  trial: Trial,
  _agent: Agent,
  _permission: Permission
): void {
  if (!canRequestApproval(trial.stage)) {
    throw new AuthorizationError(
      `Cannot request approval at stage ${trial.stage}. Stage must be CERTIFICATION_READY.`
    );
  }

  if (!trial.evidence) {
    throw new AuthorizationError('No evidence bundle found. Reproducer must be executed first.');
  }

  if (!trial.evidence.beforeRemediation) {
    throw new AuthorizationError(
      'Pre-remediation execution result missing from evidence.'
    );
  }

  if (!trial.evidence.afterRemediation) {
    throw new AuthorizationError(
      'Post-remediation execution result missing. Retest must pass before approval.'
    );
  }

  if (trial.evidence.afterRemediation.outcome !== 'VULNERABILITY_BLOCKED') {
    throw new AuthorizationError(
      'Post-remediation retest did not pass. Cannot authorize a permission with an unresolved vulnerability.'
    );
  }
}

/**
 * Creates a certification record once all conditions are satisfied.
 */
export function createCertificationRecord(
  trial: Trial,
  agent: Agent,
  permission: Permission,
  approvedBy: string
): CertificationRecord {
  // Final safety check: verify the complete path
  const nextStage = transition(trial.stage, 'HUMAN_APPROVED');
  const authorizedStage = transition(nextStage, 'AUTHORIZED');

  if (!isCertified(authorizedStage)) {
    throw new AuthorizationError('State machine did not reach AUTHORIZED state.');
  }

  return {
    id: `cert-${Date.now().toString(36)}`,
    agentId: agent.id,
    permissionId: permission.id,
    trialId: trial.id,
    evidenceId: trial.evidence!.id,
    retestPassed: true,
    humanApproved: true,
    status: 'CERTIFIED',
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    approvedBy,
  };
}

/**
 * Applies a granted certification to a permission object.
 * Returns the updated permission with AUTHORIZED status.
 */
export function applyAuthorization(
  permission: Permission,
  record: CertificationRecord,
  onEvent?: StreamCallback
): Permission {
  if (permission.status === 'AUTHORIZED') {
    return permission; // Idempotent
  }

  onEvent?.({
    id: `auth-${Date.now()}`,
    type: 'PERMISSION_AUTHORIZED',
    timestamp: new Date().toISOString(),
    message: `Permission ${permission.name} authorized by ${record.approvedBy}`,
  });

  return {
    ...permission,
    status: 'AUTHORIZED',
    certifiedAt: record.createdAt,
    authorizedBy: record.approvedBy,
    authorizedAt: record.approvedAt,
  };
}
