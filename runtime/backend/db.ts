import fs from 'fs';
import path from 'path';
import type { Trial, EvidenceBundle, CertificationRecord, Finding } from '../../src/types/trial.js';
import type { Agent, AgentProfile } from '../../src/types/agent.js';
import { AGENTS } from '../../src/data/agents.js';
import { PROFILES } from '../../src/data/profiles.js';

const DB_DIR = path.resolve(process.cwd(), 'runtime/db');

// Ensure db dir exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

function getFilePath(collection: string) {
  return path.join(DB_DIR, `${collection}.json`);
}

function readCollection<T>(collection: string): Record<string, T> {
  const file = getFilePath(collection);
  if (!fs.existsSync(file)) {
    return {};
  }
  try {
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error(`Error reading ${collection}:`, e);
    return {};
  }
}

function writeCollection<T>(collection: string, data: Record<string, T>) {
  const file = getFilePath(collection);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// -----------------------------------------------------------------------------
// Type definitions for collections
// -----------------------------------------------------------------------------

export interface ReproducerArtifact {
  id: string;
  agentId: string;
  permissionId: string;
  attackPayload: string;
  sha256: string;
  createdAt: string;
}

export interface AuthorizationState {
  status: 'AUTHORIZED' | 'LOCKED';
  authorizedAt?: string;
  trialId?: string;
}

export interface CapabilityPolicy {
  certificationRequired: boolean;
  humanApprovalRequired: boolean;
}

// -----------------------------------------------------------------------------
// Database Operations
// -----------------------------------------------------------------------------

export const db = {
  trials: {
    get(id: string): Trial | undefined {
      return readCollection<Trial>('trials')[id];
    },
    getAll(): Trial[] {
      return Object.values(readCollection<Trial>('trials'));
    },
    save(trial: Trial) {
      const all = readCollection<Trial>('trials');
      all[trial.id] = trial;
      writeCollection('trials', all);
    },
    update(id: string, updates: Partial<Trial>) {
      const all = readCollection<Trial>('trials');
      if (all[id]) {
        all[id] = { ...all[id], ...updates };
        writeCollection('trials', all);
      }
    }
  },

  reproducers: {
    get(id: string): ReproducerArtifact | undefined {
      return readCollection<ReproducerArtifact>('reproducers')[id];
    },
    save(reproducer: ReproducerArtifact) {
      const all = readCollection<ReproducerArtifact>('reproducers');
      all[reproducer.id] = reproducer;
      writeCollection('reproducers', all);
    }
  },

  authorizations: {
    // Key format: `${agentId}_${permissionId}`
    get(agentId: string, permissionId: string): AuthorizationState {
      const key = `${agentId}_${permissionId}`;
      const all = readCollection<AuthorizationState>('authorizations');
      return all[key] || { status: 'LOCKED' };
    },
    set(agentId: string, permissionId: string, state: AuthorizationState) {
      const key = `${agentId}_${permissionId}`;
      const all = readCollection<AuthorizationState>('authorizations');
      all[key] = state;
      writeCollection('authorizations', all);
    }
  },

  policies: {
    // Key format: `${agentId}_${permissionId}`
    get(agentId: string, permissionId: string): CapabilityPolicy {
      const key = `${agentId}_${permissionId}`;
      const all = readCollection<CapabilityPolicy>('policies');
      // By default, if not set, assume secure (certification required)
      return all[key] || { certificationRequired: true, humanApprovalRequired: true };
    },
    set(agentId: string, permissionId: string, policy: CapabilityPolicy) {
      const key = `${agentId}_${permissionId}`;
      const all = readCollection<CapabilityPolicy>('policies');
      all[key] = policy;
      writeCollection('policies', all);
    }
  },

  agents: {
    get(id: string): Agent | undefined {
      return AGENTS.find(a => a.id === id);
    },
    getAll(): Agent[] {
      return AGENTS;
    }
  },

  profiles: {
    get(id: string): AgentProfile | undefined {
      return PROFILES.find(p => p.id === id);
    },
    getAll(): AgentProfile[] {
      return PROFILES;
    }
  }
};
