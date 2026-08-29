/**
 * Certification Engine Safety Invariants
 *
 * These tests verify that PREMORTEM's core safety guarantees hold.
 * The certification state machine must prevent any unauthorized
 * permission bypass, regardless of UI state.
 */

import { describe, it, expect } from 'vitest';
import {
  transition,
  canRequestApproval,
  canProceedToCertification,
  isTerminalStage,
  isCertified,
  InvalidStateTransitionError,
} from '@/lib/certification-engine';

describe('Certification Engine — Safety Invariants', () => {
  describe('Invariant 1: Cannot authorize an unverified permission', () => {
    it('throws when attempting UNVERIFIED → AUTHORIZED', () => {
      expect(() => transition('UNVERIFIED', 'AUTHORIZED'))
        .toThrowError(InvalidStateTransitionError);
    });

    it('throws when attempting UNVERIFIED → HUMAN_APPROVED', () => {
      expect(() => transition('UNVERIFIED', 'HUMAN_APPROVED'))
        .toThrowError(InvalidStateTransitionError);
    });

    it('throws when attempting UNVERIFIED → CERTIFICATION_READY', () => {
      expect(() => transition('UNVERIFIED', 'CERTIFICATION_READY'))
        .toThrowError(InvalidStateTransitionError);
    });
  });

  describe('Invariant 2: Cannot certify after a failed retest', () => {
    it('throws when attempting RETEST_FAILED → CERTIFICATION_READY', () => {
      expect(() => transition('RETEST_FAILED', 'CERTIFICATION_READY'))
        .toThrowError(InvalidStateTransitionError);
    });

    it('throws when attempting RETEST_FAILED → AUTHORIZED', () => {
      expect(() => transition('RETEST_FAILED', 'AUTHORIZED'))
        .toThrowError(InvalidStateTransitionError);
    });

    it('canProceedToCertification returns false for RETEST_FAILED', () => {
      expect(canProceedToCertification('RETEST_FAILED')).toBe(false);
    });

    it('RETEST_FAILED can only transition to BLOCKED', () => {
      const result = transition('RETEST_FAILED', 'BLOCKED');
      expect(result).toBe('BLOCKED');
    });
  });

  describe('Invariant 3: Cannot skip remediation', () => {
    it('throws when attempting REPRODUCED → AUTHORIZED', () => {
      expect(() => transition('REPRODUCED', 'AUTHORIZED'))
        .toThrowError(InvalidStateTransitionError);
    });

    it('throws when attempting ATTACK_DISCOVERED → CERTIFICATION_READY', () => {
      expect(() => transition('ATTACK_DISCOVERED', 'CERTIFICATION_READY'))
        .toThrowError(InvalidStateTransitionError);
    });
  });

  describe('Invariant 4: Successful retest enables certification path', () => {
    it('RETEST_PASSED can transition to CERTIFICATION_READY', () => {
      const result = transition('RETEST_PASSED', 'CERTIFICATION_READY');
      expect(result).toBe('CERTIFICATION_READY');
    });

    it('canProceedToCertification returns true for RETEST_PASSED', () => {
      expect(canProceedToCertification('RETEST_PASSED')).toBe(true);
    });

    it('canRequestApproval returns false before CERTIFICATION_READY', () => {
      expect(canRequestApproval('RETEST_PASSED')).toBe(false);
      expect(canRequestApproval('REMEDIATED')).toBe(false);
      expect(canRequestApproval('IN_TRIAL')).toBe(false);
    });
  });

  describe('Invariant 5: Human approval is required for authorization', () => {
    it('canRequestApproval returns true only at CERTIFICATION_READY', () => {
      expect(canRequestApproval('CERTIFICATION_READY')).toBe(true);
    });

    it('CERTIFICATION_READY → HUMAN_APPROVED is valid', () => {
      const result = transition('CERTIFICATION_READY', 'HUMAN_APPROVED');
      expect(result).toBe('HUMAN_APPROVED');
    });

    it('HUMAN_APPROVED → AUTHORIZED is valid', () => {
      const result = transition('HUMAN_APPROVED', 'AUTHORIZED');
      expect(result).toBe('AUTHORIZED');
    });

    it('isCertified returns true only for AUTHORIZED', () => {
      expect(isCertified('AUTHORIZED')).toBe(true);
      expect(isCertified('HUMAN_APPROVED')).toBe(false);
      expect(isCertified('CERTIFICATION_READY')).toBe(false);
    });
  });

  describe('Invariant 6: Denial keeps the consequential permission locked', () => {
    it('CERTIFICATION_READY → BLOCKED is valid (human denies)', () => {
      const result = transition('CERTIFICATION_READY', 'BLOCKED');
      expect(result).toBe('BLOCKED');
    });

    it('BLOCKED is a terminal state — no further transitions', () => {
      expect(isTerminalStage('BLOCKED')).toBe(true);
    });

    it('BLOCKED cannot transition to any other stage', () => {
      expect(() => transition('BLOCKED', 'AUTHORIZED'))
        .toThrowError(InvalidStateTransitionError);
      expect(() => transition('BLOCKED', 'IN_TRIAL'))
        .toThrowError(InvalidStateTransitionError);
    });
  });

  describe('Valid complete certification path', () => {
    it('executes a complete successful certification lifecycle', () => {
      const stages = [
        'UNVERIFIED',
        'IN_TRIAL',
        'ATTACK_DISCOVERED',
        'REPRODUCED',
        'REMEDIATED',
        'RETEST_PASSED',
        'CERTIFICATION_READY',
        'HUMAN_APPROVED',
        'AUTHORIZED',
      ] as const;

      let current = stages[0];
      for (let i = 1; i < stages.length; i++) {
        current = transition(current, stages[i]) as typeof current;
      }

      expect(current).toBe('AUTHORIZED');
      expect(isCertified(current)).toBe(true);
      expect(isTerminalStage(current)).toBe(true);
    });
  });
});
