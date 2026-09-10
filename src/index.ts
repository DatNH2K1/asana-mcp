#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerExportTools } from "./tools/export.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerWorkspaceTools } from "./tools/workspaces.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerSectionTools } from "./tools/sections.js";
import { registerUserTools } from "./tools/users.js";
import { registerSearchTools } from "./tools/search.js";
import { registerAuditTools } from "./tools/audit.js";

const server = new McpServer({
  name: "asana-mcp",
  version: "1.1.0",
});

// Register all modular tools
registerExportTools(server);
registerTaskTools(server);
registerWorkspaceTools(server);
registerCommentTools(server);
registerSectionTools(server);
registerUserTools(server);
registerSearchTools(server);
registerAuditTools(server);

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
