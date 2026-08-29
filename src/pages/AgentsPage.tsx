import { SEEDED_AGENTS } from '@/data/agents';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Agent } from '@/types/agent';

function AgentCard({ agent }: { agent: Agent }) {
  const navigate = useNavigate();
  const lockedPerms = agent.permissions.filter(p => p.consequential && p.status === 'LOCKED');
  const authorizedPerms = agent.permissions.filter(p => p.status === 'AUTHORIZED');

  const statusColor = {
    UNVERIFIED: 'text-text-muted border-border',
    IN_TRIAL: 'text-trial border-trial/30',
    CERTIFIED: 'text-certified border-certified/30',
    BLOCKED: 'text-blocked border-blocked/30',
  }[agent.status];

  const domainIcon = {
    deployment: '🚀',
    financial: '💳',
    research: '🔬',
  }[agent.domain];

  return (
    <div
      className="card p-5 hover:border-border-strong cursor-pointer transition-all hover:shadow-lg hover:shadow-black/20 group"
      onClick={() => navigate(`/trial/${agent.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-100 border border-border flex items-center justify-center text-lg">
            {domainIcon}
          </div>
          <div>
            <div className="font-bold text-text-primary font-mono">{agent.name}</div>
            <div className="text-xs text-text-muted">{agent.role}</div>
          </div>
        </div>
        <span className={cn('text-xs font-mono px-2 py-0.5 rounded border', statusColor)}>
          {agent.status.replace('_', ' ')}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-text-secondary leading-relaxed mb-4 line-clamp-2">
        {agent.description}
      </p>

      {/* Permissions */}
      <div className="space-y-1.5 mb-4">
        {agent.permissions.slice(0, 4).map(perm => (
          <div key={perm.id} className="flex items-center justify-between">
            <span className="font-mono text-xs text-text-muted">{perm.name}</span>
            {perm.status === 'LOCKED' ? (
              <span className="badge-locked text-[10px] py-0">
                <Lock className="w-2.5 h-2.5" /> LOCKED
              </span>
            ) : perm.status === 'AUTHORIZED' ? (
              <span className="badge-certified text-[10px] py-0">
                <CheckCircle2 className="w-2.5 h-2.5" /> AUTHORIZED
              </span>
            ) : (
              <span className="text-[10px] text-text-muted font-mono">available</span>
            )}
          </div>
        ))}
        {agent.permissions.length > 4 && (
          <div className="text-[10px] text-text-muted">+{agent.permissions.length - 4} more</div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-3 text-[10px] text-text-muted font-mono">
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5 text-critical" />
            {agent.findingCount} findings
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-2.5 h-2.5 text-certified" />
            {agent.certificationCount} certs
          </span>
        </div>
        <span className="text-xs text-trial font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
          View Trial <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const agents = SEEDED_AGENTS;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="section-label mb-2">Agent Registry</div>
        <h1 className="text-2xl font-bold text-text-primary">Registered Agents</h1>
        <p className="text-text-secondary text-sm mt-1">
          Agents awaiting or undergoing certification for consequential permissions.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
