import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asanaFetch, extractGid } from "../client.js";
import type { AsanaUser, AsanaResource } from "../types/asana.js";

interface CurrentUser extends AsanaUser {
  workspaces?: AsanaResource[];
}

export function registerUserTools(server: McpServer) {
  // 1. Get authenticated user
  server.tool(
    "asana_get_me",
    "Get information about the currently authenticated Asana user/token (name, email, workspaces).",
    {},
    async () => {
      try {
        const res = await asanaFetch<CurrentUser>("users/me", {
          opt_fields: "gid,name,email,workspaces.gid,workspaces.name",
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(res.data, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error fetching user profile: ${errorMsg}` }],
        };
      }
    }
  );

  // 2. List users in workspace
  server.tool(
    "asana_list_workspace_users",
    "List all team members/users in a specific workspace to easily map assignee names and emails to GIDs.",
    {
      workspaceId: z
        .string()
        .optional()
        .describe("Workspace GID (optional, defaults to primary workspace)"),
    },
    async ({ workspaceId }) => {
      try {
        let targetWorkspace = workspaceId ? extractGid(workspaceId) : undefined;
        if (!targetWorkspace) {
          const meRes = await asanaFetch<CurrentUser>("users/me", {
            opt_fields: "workspaces.gid",
          });
          if (meRes.data?.workspaces && meRes.data.workspaces.length > 0) {
            targetWorkspace = meRes.data.workspaces[0].gid;
          } else {
            throw new Error("No accessible workspace found for account.");
          }
        }

        const res = await asanaFetch<AsanaUser[]>(`workspaces/${targetWorkspace}/users`, {
          opt_fields: "gid,name,email",
          limit: 100,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(res.data || [], null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error listing workspace users: ${errorMsg}` }],
        };
      }
    }
  );
}
