import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asanaFetch, extractGid } from "../client.js";
import type { AsanaTask, AsanaResource } from "../types/asana.js";

interface Story extends AsanaResource {
  text?: string;
  type?: string;
  created_at?: string;
  created_by?: { name?: string };
}

export function registerTaskTools(server: McpServer) {
  server.tool(
    "asana_get_project_tasks",
    "Get list of tasks in an Asana project with status, section, assignee, and custom fields.",
    {
      projectIdOrUrl: z.string().describe("Asana Project GID or URL"),
      limit: z.number().optional().default(50).describe("Maximum tasks to return (default: 50)"),
    },
    async ({ projectIdOrUrl, limit = 50 }) => {
      try {
        const projectId = extractGid(projectIdOrUrl);
        const taskFields =
          "gid,name,completed,due_on,assignee.name,memberships.section.name,num_subtasks";
        const res = await asanaFetch<AsanaTask[]>(`projects/${projectId}/tasks`, {
          opt_fields: taskFields,
          limit,
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
          content: [{ type: "text" as const, text: `Error fetching tasks: ${errorMsg}` }],
        };
      }
    }
  );

  server.tool(
    "asana_get_task_details",
    "Get comprehensive details of a specific Asana task including description, subtasks, and comments.",
    {
      taskIdOrUrl: z.string().describe("Asana Task GID or URL"),
    },
    async ({ taskIdOrUrl }) => {
      try {
        const taskId = extractGid(taskIdOrUrl);
        const taskFields =
          "gid,name,notes,html_notes,completed,completed_at,due_on,due_at,assignee.name,assignee.email,created_at,modified_at,tags.name,custom_fields,memberships.section.name,memberships.project.name,num_subtasks,parent";

        const [taskRes, subRes, storiesRes] = await Promise.all([
          asanaFetch<AsanaTask>(`tasks/${taskId}`, { opt_fields: taskFields }),
          asanaFetch<AsanaTask[]>(`tasks/${taskId}/subtasks`, { opt_fields: taskFields }),
          asanaFetch<Story[]>(`tasks/${taskId}/stories`, {
            opt_fields: "gid,text,type,created_at,created_by.name",
          }),
        ]);

        const result = {
          task: taskRes.data,
          subtasks: subRes.data || [],
          stories: storiesRes.data || [],
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error fetching task: ${errorMsg}` }],
        };
      }
    }
  );
}
