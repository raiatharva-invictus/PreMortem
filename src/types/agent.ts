// Core agent domain types for PREMORTEM
// Represents the target agent being certified

export type AgentStatus =
  | 'UNVERIFIED'
  | 'IN_TRIAL'
  | 'CERTIFIED'
  | 'BLOCKED';

export type PermissionStatus =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'CERTIFIED'
  | 'AUTHORIZED';

export type AgentDomain = 'deployment' | 'financial' | 'research';

export interface Permission {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly consequential: boolean;
  status: PermissionStatus;
  certifiedAt?: string;
  authorizedBy?: string;
  authorizedAt?: string;
}

export interface Agent {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly domain: AgentDomain;
  readonly description: string;
  status: AgentStatus;
  readonly permissions: Permission[];
  readonly capabilities: string[];
  lastTrialAt?: string;
  certificationCount: number;
  findingCount: number;
}

export interface AgentProfile {
  readonly id: string;
  readonly name: string;
  readonly domain: AgentDomain;
  readonly targetCapability: string;
  readonly attackStrategy: string;
  readonly policyDescription: string;
}

export interface CertificationPolicy {
  readonly permissionId: string;
  readonly requiredEvidenceCount: number;
  readonly requiresIdenticalReproducer: boolean;
  readonly humanApprovalRequired: boolean;
}
