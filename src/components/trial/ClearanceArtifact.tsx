import { useState } from 'react';
import { FileCode2, Fingerprint, Shield, CheckCircle2, Hash, UserCheck, PlayCircle, Check, AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Trial } from '@/types/trial';

export function ClearanceArtifact({ trial }: { trial: Trial }) {
  const [expanded, setExpanded] = useState(false);
  
  if (trial.stage !== 'AUTHORIZED' || !trial.certification || !trial.evidence) {
    return null;
  }

  const { certification, evidence, targetCapability } = trial;

  return (
    <div className="card border-certified-border bg-certified/5 overflow-hidden mb-6">
      <div 
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-certified/10 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-certified/20 border border-certified/40 flex items-center justify-center">
            <Shield className="w-6 h-6 text-certified" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-certified tracking-wider">CLEARANCE EARNED</span>
              <span className="badge-certified text-[10px]">{certification.id}</span>
            </div>
            <p className="text-sm text-text-secondary">
              <code className="text-text-primary font-mono bg-surface-100 px-1.5 py-0.5 rounded">{targetCapability}</code> authorized for <code className="text-text-primary font-mono bg-surface-100 px-1.5 py-0.5 rounded">{trial.agentId}</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-text-muted mb-1">Configuration Fingerprint</div>
            <div className="flex items-center gap-1 text-xs font-mono text-text-secondary bg-surface px-2 py-1 rounded border border-border">
              <Fingerprint className="w-3.5 h-3.5 text-certified" />
              {(certification as any).fingerprint?.slice(0, 16) || 'N/A'}...
            </div>
          </div>
          <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center bg-surface">
            <ChevronDown className={cn("w-4 h-4 text-text-muted transition-transform", expanded && "rotate-180")} />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-canvas p-6 space-y-6">
          {/* Section 1: Attack & Reproducer */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-trial" /> Reproducer Artifact
            </h3>
            <div className="p-4 rounded-lg bg-surface border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-text-muted">ID: {evidence.id}</span>
                <span className="flex items-center gap-1.5 text-xs font-mono text-text-secondary bg-canvas px-2 py-1 rounded border border-border">
                  <Hash className="w-3 h-3" /> {evidence.reproducerHash}
                </span>
              </div>
              <pre className="text-[11px] font-mono text-text-secondary leading-relaxed bg-canvas p-3 rounded border border-border overflow-x-auto whitespace-pre-wrap">
                {evidence.reproducerScript}
              </pre>
            </div>
          </div>

          {/* Section 2: Before & After Execution */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-critical">
                <AlertTriangle className="w-4 h-4" /> Before Remediation
              </h3>
              <div className="p-4 rounded-lg bg-surface border border-critical/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge-blocked font-mono">EXIT {evidence.beforeRemediation.exitCode}</span>
                  <span className="text-xs text-text-muted">{evidence.beforeRemediation.outcome}</span>
                </div>
                <div className="text-[11px] font-mono text-text-muted leading-relaxed whitespace-pre-wrap">
                  {evidence.beforeRemediation.stdout || '(no stdout)'}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-certified">
                <Shield className="w-4 h-4" /> After Remediation
              </h3>
              <div className="p-4 rounded-lg bg-surface border border-certified/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-trial to-certified" />
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge-certified font-mono">EXIT {evidence.afterRemediation?.exitCode}</span>
                  <span className="text-xs text-text-muted">{evidence.afterRemediation?.outcome}</span>
                </div>
                <div className="text-[11px] font-mono text-text-muted leading-relaxed whitespace-pre-wrap">
                  {evidence.afterRemediation?.stdout || '(no stdout)'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Verification Chain */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-certified" /> Verification Chain
            </h3>
            <div className="p-4 rounded-lg bg-surface border border-border grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-[10px] text-text-muted uppercase tracking-wider">Independent Verifier</div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-certified">
                  <Check className="w-3.5 h-3.5" /> PASSED
                </div>
                <div className="text-[10px] text-text-muted">Hash match enforced.</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-text-muted uppercase tracking-wider">Human Checkpoint</div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-certified">
                  <UserCheck className="w-3.5 h-3.5" /> APPROVED
                </div>
                <div className="text-[10px] text-text-muted">{new Date(certification.approvedAt!).toLocaleString()}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-text-muted uppercase tracking-wider">Sandbox Environment</div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                  <PlayCircle className="w-3.5 h-3.5 text-trial" /> DAYTONA
                </div>
                <div className="text-[10px] text-text-muted">Isolated Execution</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
