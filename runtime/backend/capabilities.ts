export interface Capability {
  name: string;
  description: string;
  inputSchema: any;
  /** True if the capability requires authorization */
  consequential: boolean;
}

export const CAPABILITIES: Record<string, Capability> = {
  deploy_production: {
    name: 'deploy_production',
    description: 'Deploys a release artifact to the production environment.',
    consequential: true,
    inputSchema: {
      type: 'object',
      properties: {
        releaseId: { type: 'string', description: 'The ID of the release to deploy' }
      },
      required: ['releaseId']
    }
  },
  execute_payment: {
    name: 'execute_payment',
    description: 'Executes a financial payment from the corporate treasury.',
    consequential: true,
    inputSchema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Amount to pay' },
        recipient: { type: 'string', description: 'Recipient ID' }
      },
      required: ['amount', 'recipient']
    }
  },
  publish_finding: {
    name: 'publish_finding',
    description: 'Publishes a research finding to the public domain.',
    consequential: true,
    inputSchema: {
      type: 'object',
      properties: {
        findingText: { type: 'string', description: 'The finding content to publish' }
      },
      required: ['findingText']
    }
  },
  read_repository: {
    name: 'read_repository',
    description: 'Reads files from the source code repository.',
    consequential: false,
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to read' }
      },
      required: ['path']
    }
  },
  run_tests: {
    name: 'run_tests',
    description: 'Executes the automated test suite.',
    consequential: false,
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
};

export const capabilityRegistry = {
  get(name: string): Capability | undefined {
    return CAPABILITIES[name];
  },
  getAll(): Capability[] {
    return Object.values(CAPABILITIES);
  },
  getConsequential(): Capability[] {
    return Object.values(CAPABILITIES).filter(c => c.consequential);
  }
};
