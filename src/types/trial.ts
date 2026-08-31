// Certification trial state machine types

export type TrialStage =
  | 'UNVERIFIED'
  | 'IN_TRIAL'
  | 'ATTACK_DISCOVERED'
  | 'REPRODUCED'
  | 'REMEDIATED'
  | 'RETEST_PASSED'
  | 'RETEST_FAILED'
  | 'CERTIFICATION_READY'
  | 'HUMAN_APPROVED'
  | 'AUTHORIZED'
  | 'BLOCKED';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SecurityTestOutcome = 'VULNERABILITY_REPRODUCED' | 'VULNERABILITY_BLOCKED';

export interface Finding {
  readonly id: string;
  readonly title: string;
  readonly severity: Severity;
  readonly description: string;
  readonly targetPermission: string;
  readonly attackVector: string;
  readonly reproducerId: string;
  readonly discoveredAt: string;
}

export interface ExecutionResult {
  readonly outcome: SecurityTestOutcome;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
  readonly timestamp: string;
  readonly reproducerHash: string;
}

export interface EvidenceBundle {
  readonly id: string;
  readonly findingId: string;
  readonly agentId: string;
  readonly targetPermission: string;
  // The reproducer script content
  readonly reproducerScript: string;
  // SHA-256 hash proving identical test used in both runs
  readonly reproducerHash: string;
  readonly sandboxEnvironment: 'TRUEFORGE_SANDBOX' | 'LOCAL_PROCESS';
  readonly beforeRemediation: ExecutionResult;
  readonly remediationDiff: string;
  afterRemediation?: ExecutionResult;
  readonly createdAt: string;
}

export interface CertificationRecord {
  readonly id: string;
  readonly agentId: string;
  readonly permissionId: string;
  readonly trialId: string;
  readonly evidenceId: string;
  readonly retestPassed: boolean;
  readonly humanApproved: boolean;
  readonly status: 'PENDING' | 'CERTIFIED' | 'DENIED';
  readonly createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  deniedAt?: string;
  deniedReason?: string;
}

export interface Trial {
  readonly id: string;
  readonly agentId: string;
  readonly targetCapability: string;
  stage: TrialStage;
  readonly startedAt: string;
  finding?: Finding;
  evidence?: EvidenceBundle;
  certification?: CertificationRecord;
  // TrueForge session ID for this trial
  trueforgeSessionId?: string;
  // Pending approval data from TrueForge
  pendingApproval?: PendingApproval;
}

export interface PendingApproval {
  readonly toolCallId: string;
  readonly threadId: string;
  readonly toolName: string;
  readonly requestedAt: string;
}

// Events emitted by the trial system for real-time UI updates
export type TrialEventType =
  | 'TRIAL_STARTED'
  | 'ATTACK_GENERATED'
  | 'SANDBOX_STARTED'
  | 'SANDBOX_OUTPUT'
  | 'SANDBOX_COMPLETED'
  | 'FINDING_CREATED'
  | 'REMEDIATION_APPLIED'
  | 'RETEST_STARTED'
  | 'RETEST_COMPLETED'
  | 'CERTIFICATION_READY'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED'
  | 'PERMISSION_AUTHORIZED';

export interface TrialEvent {
  readonly type: TrialEventType;
  readonly timestamp: string;
  readonly payload?: unknown;
}
