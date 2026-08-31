// Real-time event model for trial execution updates
// Used by the UI to consume runtime events

export type RuntimeEventType =
  | 'TRIAL_STARTED'
  | 'SUBAGENT_STARTED'
  | 'ATTACK_GENERATED'
  | 'TOOL_CALLED'
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

export interface RuntimeEvent {
  readonly id: string;
  readonly type: RuntimeEventType;
  readonly timestamp: string;
  readonly message: string;
  readonly payload?: unknown;
}

export type EventListener = (event: RuntimeEvent) => void;
