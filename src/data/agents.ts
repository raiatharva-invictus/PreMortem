import type { Agent } from '@/types/agent';

export const SEEDED_AGENTS: Agent[] = [
  {
    id: 'agent-atlas-001',
    name: 'ATLAS',
    role: 'Release Agent',
    domain: 'deployment',
    description:
      'Automated release and deployment agent responsible for verifying release artifacts and orchestrating deployment pipelines.',
    status: 'IN_TRIAL',
    permissions: [
      {
        id: 'perm-read-repo',
        name: 'read_repository',
        description: 'Read source code and release manifests from the repository.',
        consequential: false,
        status: 'AVAILABLE',
      },
      {
        id: 'perm-inspect',
        name: 'inspect_changes',
        description: 'Inspect diffs and change sets from pull requests.',
        consequential: false,
        status: 'AVAILABLE',
      },
      {
        id: 'perm-run-tests',
        name: 'run_tests',
        description: 'Execute the automated test suite against release candidates.',
        consequential: false,
        status: 'AVAILABLE',
      },
      {
        id: 'perm-deploy-staging',
        name: 'deploy_staging',
        description: 'Deploy release candidates to the staging environment.',
        consequential: false,
        status: 'AVAILABLE',
      },
      {
        id: 'perm-deploy-prod',
        name: 'deploy_production',
        description:
          'Deploy release artifacts to the production environment. CONSEQUENTIAL — requires PREMORTEM certification.',
        consequential: true,
        status: 'LOCKED',
      },
    ],
    capabilities: ['read_repository', 'inspect_changes', 'run_tests', 'deploy_staging'],
    certificationCount: 3,
    findingCount: 1,
    lastTrialAt: new Date().toISOString(),
  },
  {
    id: 'agent-orion-002',
    name: 'ORION',
    role: 'Research Agent',
    domain: 'research',
    description:
      'Autonomous research agent that synthesizes scientific literature and can publish findings to internal knowledge bases.',
    status: 'BLOCKED',
    permissions: [
      {
        id: 'perm-search-papers',
        name: 'search_papers',
        description: 'Search academic databases and retrieve paper metadata.',
        consequential: false,
        status: 'AVAILABLE',
      },
      {
        id: 'perm-read-papers',
        name: 'read_full_text',
        description: 'Download and read full text of academic papers.',
        consequential: false,
        status: 'AVAILABLE',
      },
      {
        id: 'perm-publish-finding',
        name: 'publish_finding',
        description: 'Publish research findings to external databases or journals.',
        consequential: true,
        status: 'LOCKED',
      },
    ],
    capabilities: ['search_papers', 'read_full_text'],
    certificationCount: 0,
    findingCount: 2,
    lastTrialAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'agent-mercury-003',
    name: 'MERCURY',
    role: 'Payment Agent',
    domain: 'financial',
    description:
      'Financial operations agent that handles invoice processing and vendor payment orchestration.',
    status: 'UNVERIFIED',
    permissions: [
      {
        id: 'perm-read-invoices',
        name: 'read_invoices',
        description: 'Access invoice records and vendor payment details.',
        consequential: false,
        status: 'AVAILABLE',
      },
      {
        id: 'perm-execute-payment',
        name: 'execute_payment',
        description: 'Execute wire transfers and vendor payments.',
        consequential: true,
        status: 'LOCKED',
      },
    ],
    capabilities: ['read_invoices'],
    certificationCount: 0,
    findingCount: 0,
  },
];

export function getAgentById(id: string): Agent | undefined {
  return SEEDED_AGENTS.find((a) => a.id === id);
}

export const ATLAS = SEEDED_AGENTS[0];
