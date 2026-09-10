import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asanaFetch, extractGid } from "../client.js";
import type { AsanaTask, AsanaResource } from "../types/asana.js";

const SEARCH_TASK_FIELDS =
  "gid,name,completed,due_on,due_at,assignee.name,memberships.project.name,memberships.section.name,modified_at,num_subtasks";

export function registerSearchTools(server: McpServer) {
  // 1. Search tasks in workspace
  server.tool(
    "asana_search_tasks",
    "Search tasks across a workspace by keywords, completion status, assignee, or date range.",
    {
      workspaceId: z.string().optional().describe("Workspace GID (optional, defaults to primary workspace)"),
      query: z.string().optional().describe("Text query matching name or description"),
      completed: z.boolean().optional().describe("Filter by completed status"),
      assignee: z.string().optional().describe("Filter by assignee GID, email, or 'me'"),
      dueOnOrBefore: z.string().optional().describe("Filter tasks due on or before (YYYY-MM-DD)"),
      dueOnOrAfter: z.string().optional().describe("Filter tasks due on or after (YYYY-MM-DD)"),
      projectId: z.string().optional().describe("Filter tasks in specific project GID"),
      limit: z.number().optional().default(30).describe("Max results (default: 30)"),
    },
    async ({
      workspaceId,
      query,
      completed,
      assignee,
      dueOnOrBefore,
      dueOnOrAfter,
      projectId,
      limit = 30,
    }) => {
      try {
        let targetWorkspace = workspaceId ? extractGid(workspaceId) : undefined;
        if (!targetWorkspace) {
          const wsRes = await asanaFetch<AsanaResource[]>("workspaces", { opt_fields: "gid" });
          if (wsRes.data && wsRes.data.length > 0) {
            targetWorkspace = wsRes.data[0].gid;
          } else {
            throw new Error("No workspaces found for account.");
          }
        }

        const params: Record<string, unknown> = {
          opt_fields: SEARCH_TASK_FIELDS,
          limit,
        };

        if (query) params.text = query;
        if (completed !== undefined) params.completed = completed;
        if (assignee) {
          params["assignee.any"] = assignee === "me" ? "me" : extractGid(assignee);
        }
        if (dueOnOrBefore) params["due_on.before"] = dueOnOrBefore;
        if (dueOnOrAfter) params["due_on.after"] = dueOnOrAfter;
        if (projectId) params["projects.any"] = extractGid(projectId);

        const res = await asanaFetch<AsanaTask[]>(`workspaces/${targetWorkspace}/tasks/search`, params);

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
          content: [{ type: "text" as const, text: `Error searching tasks: ${errorMsg}` }],
        };
      }
    }
  );

  // 2. Get my tasks
  server.tool(
    "asana_get_my_tasks",
    "Get all active or completed tasks assigned to the currently authenticated user.",
    {
      workspaceId: z.string().optional().describe("Workspace GID (optional, defaults to primary workspace)"),
      completed: z.boolean().optional().default(false).describe("Filter by completion status (default: false for open tasks)"),
      limit: z.number().optional().default(50).describe("Max tasks to return (default: 50)"),
    },
    async ({ workspaceId, completed = false, limit = 50 }) => {
      try {
        let targetWorkspace = workspaceId ? extractGid(workspaceId) : undefined;
        if (!targetWorkspace) {
          const wsRes = await asanaFetch<AsanaResource[]>("workspaces", { opt_fields: "gid" });
          if (wsRes.data && wsRes.data.length > 0) {
            targetWorkspace = wsRes.data[0].gid;
          } else {
            throw new Error("No workspaces found for account.");
          }
        }

        const params: Record<string, unknown> = {
          workspace: targetWorkspace,
          assignee: "me",
          completed_since: completed ? undefined : "now",
          opt_fields: SEARCH_TASK_FIELDS,
          limit,
        };

        const res = await asanaFetch<AsanaTask[]>("tasks", params);

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
          content: [{ type: "text" as const, text: `Error fetching My Tasks: ${errorMsg}` }],
        };
      }
    }
  );
}
