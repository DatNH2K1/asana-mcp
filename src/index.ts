#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerExportTools } from "./tools/export.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerWorkspaceTools } from "./tools/workspaces.js";

const server = new McpServer({
  name: "asana-mcp",
  version: "1.0.0",
});

// Register all modular tools
registerExportTools(server);
registerTaskTools(server);
registerWorkspaceTools(server);

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
