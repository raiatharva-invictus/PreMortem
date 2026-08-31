import { SEEDED_AGENTS } from '@/data/agents';
import { Shield, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG = {
  UNVERIFIED: { label: 'Unverified', color: 'text-text-muted', bg: 'bg-surface border-border' },
  IN_TRIAL: { label: 'In Trial', color: 'text-trial', bg: 'bg-trial/5 border-trial/20' },
  CERTIFIED: { label: 'Certified', color: 'text-certified', bg: 'bg-certified/5 border-certified/20' },
  BLOCKED: { label: 'Blocked', color: 'text-blocked', bg: 'bg-blocked/5 border-blocked/20' },
};

export default function OverviewPage() {
  const navigate = useNavigate();
  const agents = SEEDED_AGENTS;
  const totalFindings = agents.reduce((s, a) => s + a.findingCount, 0);
  const totalCerts = agents.reduce((s, a) => s + a.certificationCount, 0);
  const lockedPerms = agents.flatMap(a => a.permissions).filter(p => p.consequential && p.status === 'LOCKED').length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="section-label mb-2">Platform Overview</div>
        <h1 className="text-2xl font-bold text-text-primary">PREMORTEM Console</h1>
        <p className="text-text-secondary text-sm mt-1">
          Agent certification and earned-autonomy platform. Consequential permissions require adversarial evidence.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Registered Agents', value: agents.length, icon: Shield, color: 'text-trial' },
          { label: 'Locked Permissions', value: lockedPerms, icon: AlertTriangle, color: 'text-locked' },
          { label: 'Total Findings', value: totalFindings, icon: AlertTriangle, color: 'text-critical' },
          { label: 'Certifications Issued', value: totalCerts, icon: CheckCircle2, color: 'text-certified' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="section-label">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-3xl font-bold text-text-primary">{value}</div>
          </div>
        ))}
      </div>

      {/* Core thesis callout */}
      <div className="p-5 rounded-xl bg-trial/5 border border-trial/20 mb-8">
        <div className="section-label text-trial mb-2">Core Invariant</div>
        <div className="font-mono text-sm text-text-primary">
          "AI agents don't get consequential permissions. They earn them through adversarial evidence."
        </div>
        <div className="mt-3 text-xs text-text-secondary">
          Every consequential permission is gated behind: adversarial trial → passing retest → human approval.
          The state machine enforces this — it cannot be bypassed by the UI.
        </div>
      </div>

      {/* Agent table */}
      <div>
        <div className="section-label mb-3">Registered Agents</div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-50">
                <th className="text-left px-4 py-3 text-text-muted font-medium text-xs">Agent</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium text-xs">Domain</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium text-xs">Status</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium text-xs">Locked Perms</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium text-xs">Last Trial</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const cfg = STATUS_CONFIG[agent.status];
                const locked = agent.permissions.filter(p => p.consequential && p.status === 'LOCKED').length;
                return (
                  <tr
                    key={agent.id}
                    className="border-b border-border last:border-0 hover:bg-surface-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/trial/${agent.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-text-primary font-mono">{agent.name}</div>
                      <div className="text-xs text-text-muted">{agent.role}</div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary capitalize">{agent.domain}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono border ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {locked > 0 ? (
                        <span className="badge-locked">{locked} locked</span>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">
                      {agent.lastTrialAt ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(agent.lastTrialAt)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-xs text-trial hover:text-trial/80 font-medium"
                        onClick={(e) => { e.stopPropagation(); navigate(`/trial/${agent.id}`); }}
                      >
                        View Trial →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
