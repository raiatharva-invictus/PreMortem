import type { Trial, PendingApproval } from '../types/trial.js';
import type { RuntimeEvent } from '../types/events.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

export type StreamCallback = (event: RuntimeEvent) => void;

/**
 * Creates a new trial in the backend.
 */
export async function createTrial(agentId: string, targetCapability: string): Promise<Trial> {
  const res = await fetch(`${BACKEND_URL}/api/trials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, targetCapability })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/**
 * Starts the attack phase and listens to the SSE stream.
 */
export function runAttackStream(trialId: string, onEvent: StreamCallback): Promise<Trial> {
  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(`${BACKEND_URL}/api/trials/${trialId}/attack`);
    
    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        onEvent(event);
        if (event.type === 'FINDING_CREATED') {
          eventSource.close();
          resolve(event.payload as Trial);
        } else if (event.type === 'ERROR') {
          eventSource.close();
          reject(new Error(event.message));
        }
      } catch (err) {
        console.error('Failed to parse SSE', e.data);
      }
    };
    
    eventSource.onerror = (e) => {
      eventSource.close();
      reject(new Error('Connection lost to attack stream'));
    };
  });
}

/**
 * Applies remediation policy on the backend.
 */
export async function applyRemediation(trialId: string): Promise<Trial> {
  const res = await fetch(`${BACKEND_URL}/api/trials/${trialId}/remediate`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/**
 * Starts the retest phase and listens to the SSE stream.
 */
export function runRetestStream(trialId: string, onEvent: StreamCallback): Promise<Trial> {
  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(`${BACKEND_URL}/api/trials/${trialId}/retest`);
    let finalTrial: Trial | null = null;
    
    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        onEvent(event);
        if (event.type === 'TRIAL_UPDATED') {
          finalTrial = event.payload;
          eventSource.close();
          resolve(finalTrial!);
        } else if (event.type === 'ERROR') {
          eventSource.close();
          reject(new Error(event.message));
        }
      } catch (err) {
        console.error('Failed to parse SSE', e.data);
      }
    };
    
    eventSource.onerror = (e) => {
      eventSource.close();
      reject(new Error('Connection lost to retest stream'));
    };
  });
}

/**
 * Grants human approval in the backend.
 */
export async function grantHumanApproval(trialId: string, decision: 'allow' | 'deny'): Promise<Trial> {
  const res = await fetch(`${BACKEND_URL}/api/trials/${trialId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/**
 * Fetch a single trial by ID.
 */
export async function getTrial(trialId: string): Promise<Trial> {
  const res = await fetch(`${BACKEND_URL}/api/trials/${trialId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
