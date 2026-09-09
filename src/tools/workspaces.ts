import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asanaFetch } from "../client.js";
import type { AsanaResource, AsanaProject } from "../types/asana.js";

interface WorkspaceResource extends AsanaResource {
  is_organization?: boolean;
}

export function registerWorkspaceTools(server: McpServer) {
  server.tool(
    "asana_list_workspaces",
    "List all Asana workspaces accessible to the authenticated account.",
    {},
    async () => {
      try {
        const res = await asanaFetch<WorkspaceResource[]>("workspaces", {
          opt_fields: "gid,name,is_organization",
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error listing workspaces: ${errorMsg}` }],
        };
      }
    }
  );

  server.tool(
    "asana_list_projects",
    "List all projects in an Asana workspace.",
    {
      workspaceId: z
        .string()
        .optional()
        .describe("Workspace GID (optional, defaults to primary workspace)"),
      archived: z.boolean().optional().default(false).describe("Include archived projects"),
    },
    async ({ workspaceId, archived = false }) => {
      try {
        let targetWorkspace = workspaceId;
        if (!targetWorkspace) {
          const wsRes = await asanaFetch<WorkspaceResource[]>("workspaces", {
            opt_fields: "gid",
          });
          if (wsRes.data && wsRes.data.length > 0) {
            targetWorkspace = wsRes.data[0].gid;
          } else {
            throw new Error("No workspaces found for account.");
          }
        }

        const res = await asanaFetch<AsanaProject[]>(`workspaces/${targetWorkspace}/projects`, {
          opt_fields: "gid,name,color,archived,created_at,modified_at",
          archived,
          limit: 100,
        });

        return {
          content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error listing projects: ${errorMsg}` }],
        };
      }
    }
  );
}
