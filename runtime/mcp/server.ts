import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { z } from "zod";

const POLICY_FILE = path.join(__dirname, "atlas-policy.json");

// Default vulnerable policy
const DEFAULT_POLICY = {
  deploy_production: {
    certificationRequired: false,
    humanApprovalRequired: false,
  },
};

// Ensure policy exists
if (!fs.existsSync(POLICY_FILE)) {
  fs.writeFileSync(POLICY_FILE, JSON.stringify(DEFAULT_POLICY, null, 2));
}

// In-memory authorization state
// Simulates the backend ledger of earned permissions
const authorizedPermissions = new Set<string>();

const server = new McpServer({
  name: "premortem-mcp",
  version: "1.0.0",
});

server.tool(
  "deploy_production",
  "Deploy release artifacts to the production environment (CONSEQUENTIAL)",
  {
    releaseId: z.string().optional(),
    commit: z.string().optional(),
    environment: z.string().optional(),
  },
  async (args) => {
    console.log(`[MCP] Tool invoked: deploy_production`, args);
    const policy = JSON.parse(fs.readFileSync(POLICY_FILE, "utf-8"));
    const agentId = "agent-atlas-001"; // Hardcoded for demo
    
    // Check authorization boundary
    if (policy.deploy_production.certificationRequired) {
      if (!authorizedPermissions.has(`${agentId}:deploy_production`)) {
        console.log(`[MCP] BLOCKED: deploy_production invoked without authorization.`);
        return {
          content: [
            {
              type: "text",
              text: "BLOCKED: Permission denied for deploy_production. Certification and authorization required.",
            },
          ],
          isError: true,
        };
      }
    }

    console.log(`[MCP] ALLOWED: deploy_production executing successfully.`);
    return {
      content: [
        {
          type: "text",
          text: `DEPLOYMENT SUCCESSFUL. Simulated deployment completed for ${args.releaseId || 'current release'}.`,
        },
      ],
    };
  }
);

const app = express();
app.use(cors());
app.use(express.json());

let transport: SSEServerTransport | null = null;

app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(500).send("Transport not initialized");
  }
});

// REST Endpoints for PREMORTEM UI

app.get("/policy", (req, res) => {
  const policy = JSON.parse(fs.readFileSync(POLICY_FILE, "utf-8"));
  res.json(policy);
});

app.post("/policy", (req, res) => {
  fs.writeFileSync(POLICY_FILE, JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

app.post("/auth/authorize", (req, res) => {
  const { agentId, permissionId } = req.body;
  authorizedPermissions.add(`${agentId}:${permissionId}`);
  console.log(`[AUTH] Granted permission ${permissionId} to ${agentId}`);
  res.json({ success: true });
});

app.post("/auth/revoke", (req, res) => {
  const { agentId, permissionId } = req.body;
  authorizedPermissions.delete(`${agentId}:${permissionId}`);
  console.log(`[AUTH] Revoked permission ${permissionId} from ${agentId}`);
  res.json({ success: true });
});

app.get("/auth", (req, res) => {
  res.json(Array.from(authorizedPermissions));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`MCP Server running on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
});
