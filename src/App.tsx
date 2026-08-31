import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Shield,
  LayoutDashboard,
  Bot,
  FileSearch,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkHealth } from '@/lib/api';
import OverviewPage from '@/pages/OverviewPage';
import AgentsPage from '@/pages/AgentsPage';
import TrialPage from '@/pages/TrialPage';
import EvidencePage from '@/pages/EvidencePage';
import LandingPage from '@/pages/LandingPage';

const NAV = [
  { to: '/overview', icon: LayoutDashboard, label: 'Overview' },
  { to: '/agents', icon: Bot, label: 'Agent Registry' },
  { to: '/trial/agent-atlas-001', icon: Shield, label: 'Certification Trial' },
  { to: '/evidence', icon: FileSearch, label: 'Evidence' },
];

function Sidebar() {
  const [health, setHealth] = useState<{ status: string; trueforgeUrl: string } | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    checkHealth()
      .then(setHealth)
      .catch(() => setOffline(true));
  }, []);

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-surface flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-trial/20 border border-trial/30 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-trial" />
          </div>
          <div>
            <div className="text-sm font-bold text-text-primary tracking-tight">PREMORTEM</div>
            <div className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Agent Certification</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors group',
                isActive
                  ? 'bg-trial/10 text-trial border border-trial/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-100'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer — live backend/TrueForge status from /health endpoint */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-canvas">
          <div className={cn(
            'w-1.5 h-1.5 rounded-full',
            offline ? 'bg-blocked' : health ? 'bg-certified animate-pulse' : 'bg-locked animate-pulse'
          )} />
          <span className="text-[10px] font-mono text-text-muted truncate">
            {offline
              ? 'TrueForge: offline'
              : health
              ? 'TrueForge: online'
              : 'TrueForge: connecting…'}
          </span>
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/*"
          element={
            <div className="flex h-screen bg-canvas overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-auto">
                <Routes>
                  <Route path="/overview" element={<OverviewPage />} />
                  <Route path="/agents" element={<AgentsPage />} />
                  <Route path="/trial/:agentId" element={<TrialPage />} />
                  <Route path="/evidence" element={<EvidencePage />} />
                  <Route path="*" element={<OverviewPage />} />
                </Routes>
              </main>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
