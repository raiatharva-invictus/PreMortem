import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, Lock, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-10 py-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-trial/20 border border-trial/30 flex items-center justify-center">
            <Lock className="w-4 h-4 text-trial" />
          </div>
          <span className="text-sm font-bold text-text-primary tracking-tight">PREMORTEM</span>
        </div>
        <button
          onClick={() => navigate('/overview')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-trial/10 border border-trial/20 text-trial text-sm font-medium hover:bg-trial/20 transition-colors"
        >
          Enter Console <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-trial/10 border border-trial/20 text-trial text-xs font-mono font-medium mb-8">
          <Zap className="w-3 h-3" />
          WeMakeDevs × TrueForge Hackathon
        </div>

        <h1 className="text-5xl font-bold text-text-primary leading-tight max-w-3xl mb-6">
          AI agents don't get consequential permissions.
          <br />
          <span className="text-trial">They earn them.</span>
        </h1>

        <p className="text-lg text-text-secondary max-w-2xl mb-10 leading-relaxed">
          PREMORTEM is an agent certification layer. Before any AI agent receives
          a consequential capability — deploy, pay, publish — it must survive an
          adversarial trial run through TrueForge's agent harness.
        </p>

        {/* Pipeline visual */}
        <div className="flex items-center gap-2 mb-12 flex-wrap justify-center">
          {['DISCOVER', 'ATTACK', 'REPRODUCE', 'REMEDIATE', 'RETEST', 'CERTIFY', 'AUTHORIZE'].map(
            (stage, i, arr) => (
              <div key={stage} className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded bg-surface border border-border text-xs font-mono text-text-secondary">
                  {stage}
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-text-muted shrink-0" />
                )}
              </div>
            )
          )}
        </div>

        <button
          onClick={() => navigate('/trial/agent-atlas-001')}
          className="flex items-center gap-2.5 px-6 py-3 rounded-lg bg-trial text-white font-semibold text-sm hover:bg-trial/90 transition-colors shadow-lg shadow-trial/20"
        >
          <Shield className="w-4 h-4" />
          View Live Certification Trial
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Feature cards */}
        <div className="grid grid-cols-3 gap-4 mt-20 max-w-3xl w-full">
          {[
            {
              icon: AlertTriangle,
              color: 'text-critical',
              bg: 'bg-blocked/5 border-blocked/20',
              title: 'Adversarial Evidence',
              desc: 'Every finding is backed by a reproducible attack script with a cryptographic hash.',
            },
            {
              icon: Shield,
              color: 'text-trial',
              bg: 'bg-trial/5 border-trial/20',
              title: 'TrueForge Harness',
              desc: 'Trials run in TrueForge sessions. Approval gates are real — not UI buttons.',
            },
            {
              icon: CheckCircle2,
              color: 'text-certified',
              bg: 'bg-certified/5 border-certified/20',
              title: 'Earned Authorization',
              desc: 'Same reproducer. Different outcome. That\'s the only acceptable proof.',
            },
          ].map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className={`p-5 rounded-xl border ${bg} text-left`}>
              <Icon className={`w-5 h-5 ${color} mb-3`} />
              <h3 className="text-sm font-semibold text-text-primary mb-1.5">{title}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
