import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asanaFetch, extractGid } from "../client.js";
import type { AsanaTask, AsanaStory } from "../types/asana.js";

const TASK_FIELDS =
  "gid,name,notes,html_notes,completed,completed_at,due_on,due_at,start_on,start_at,assignee.name,assignee.email,created_at,modified_at,tags.name,custom_fields,memberships.section.name,memberships.project.name,num_subtasks,parent";

export function registerTaskTools(server: McpServer) {
  // 1. Get project tasks
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

  // 2. Get task details
  server.tool(
    "asana_get_task_details",
    "Get comprehensive details of a specific Asana task including description, subtasks, and comments.",
    {
      taskIdOrUrl: z.string().describe("Asana Task GID or URL"),
    },
    async ({ taskIdOrUrl }) => {
      try {
        const taskId = extractGid(taskIdOrUrl);

        const [taskRes, subRes, storiesRes] = await Promise.all([
          asanaFetch<AsanaTask>(`tasks/${taskId}`, { opt_fields: TASK_FIELDS }),
          asanaFetch<AsanaTask[]>(`tasks/${taskId}/subtasks`, { opt_fields: TASK_FIELDS }),
          asanaFetch<AsanaStory[]>(`tasks/${taskId}/stories`, {
            opt_fields: "gid,text,html_text,type,is_pinned,created_at,created_by.name,created_by.email",
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

  // 3. Create task
  server.tool(
    "asana_create_task",
    "Create a new task in Asana under a specified project, section, or workspace.",
    {
      name: z.string().describe("The name/title of the task"),
      notes: z.string().optional().describe("Plain text description of the task"),
      html_notes: z.string().optional().describe("HTML formatted description of the task"),
      projectId: z.string().optional().describe("Project GID or URL to add the task to"),
      sectionId: z.string().optional().describe("Section GID or URL to place the task into"),
      workspaceId: z.string().optional().describe("Workspace GID (required if projectId is not provided)"),
      assignee: z.string().optional().describe("User GID or email (or 'me') to assign the task to"),
      due_on: z.string().optional().describe("Due date in YYYY-MM-DD format"),
      due_at: z.string().optional().describe("Due date-time in UTC ISO 8601 format"),
      parent: z.string().optional().describe("Parent task GID to create as subtask"),
    },
    async ({ name, notes, html_notes, projectId, sectionId, workspaceId, assignee, due_on, due_at, parent }) => {
      try {
        const payload: Record<string, unknown> = { name };
        if (notes !== undefined) payload.notes = notes;
        if (html_notes !== undefined) payload.html_notes = html_notes;
        if (assignee !== undefined) payload.assignee = assignee;
        if (due_on !== undefined) payload.due_on = due_on;
        if (due_at !== undefined) payload.due_at = due_at;

        if (projectId) {
          const cleanProjectId = extractGid(projectId);
          payload.projects = [cleanProjectId];
          if (sectionId) {
            payload.memberships = [
              {
                project: cleanProjectId,
                section: extractGid(sectionId),
              },
            ];
          }
        } else if (workspaceId) {
          payload.workspace = extractGid(workspaceId);
        }

        if (parent) {
          payload.parent = extractGid(parent);
        }

        const res = await asanaFetch<AsanaTask>("tasks", {
          method: "POST",
          params: { opt_fields: TASK_FIELDS },
          data: payload,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Task created successfully!\n\n${JSON.stringify(res.data, null, 2)}`,
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error creating task: ${errorMsg}` }],
        };
      }
    }
  );

  // 4. Update task
  server.tool(
    "asana_update_task",
    "Update fields of an existing Asana task (e.g. name, notes, completion status, due date, assignee).",
    {
      taskIdOrUrl: z.string().describe("Asana Task GID or URL to update"),
      name: z.string().optional().describe("New name/title for the task"),
      notes: z.string().optional().describe("New plain text description"),
      html_notes: z.string().optional().describe("New HTML formatted description"),
      completed: z.boolean().optional().describe("Mark task as completed (true) or incomplete (false)"),
      due_on: z.string().optional().nullable().describe("New due date (YYYY-MM-DD) or null to clear"),
      due_at: z.string().optional().nullable().describe("New due date-time ISO string or null to clear"),
      assignee: z.string().optional().nullable().describe("User GID, email, 'me', or null to unassign"),
    },
    async ({ taskIdOrUrl, name, notes, html_notes, completed, due_on, due_at, assignee }) => {
      try {
        const taskId = extractGid(taskIdOrUrl);
        const payload: Record<string, unknown> = {};

        if (name !== undefined) payload.name = name;
        if (notes !== undefined) payload.notes = notes;
        if (html_notes !== undefined) payload.html_notes = html_notes;
        if (completed !== undefined) payload.completed = completed;
        if (due_on !== undefined) payload.due_on = due_on;
        if (due_at !== undefined) payload.due_at = due_at;
        if (assignee !== undefined) payload.assignee = assignee;

        const res = await asanaFetch<AsanaTask>(`tasks/${taskId}`, {
          method: "PUT",
          params: { opt_fields: TASK_FIELDS },
          data: payload,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Task updated successfully!\n\n${JSON.stringify(res.data, null, 2)}`,
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error updating task: ${errorMsg}` }],
        };
      }
    }
  );

  // 5. Delete task
  server.tool(
    "asana_delete_task",
    "Permanently delete a task from Asana by its GID or URL.",
    {
      taskIdOrUrl: z.string().describe("Asana Task GID or URL to delete"),
    },
    async ({ taskIdOrUrl }) => {
      try {
        const taskId = extractGid(taskIdOrUrl);
        await asanaFetch(`tasks/${taskId}`, {
          method: "DELETE",
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Task ${taskId} deleted successfully.`,
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error deleting task: ${errorMsg}` }],
        };
      }
    }
  );

  // 6. Create subtask
  server.tool(
    "asana_create_subtask",
    "Create a subtask under a specific parent task in Asana.",
    {
      parentTaskIdOrUrl: z.string().describe("Parent Asana Task GID or URL"),
      name: z.string().describe("Name/title of the subtask"),
      notes: z.string().optional().describe("Description for the subtask"),
      assignee: z.string().optional().describe("User GID, email, or 'me'"),
      due_on: z.string().optional().describe("Due date in YYYY-MM-DD format"),
    },
    async ({ parentTaskIdOrUrl, name, notes, assignee, due_on }) => {
      try {
        const parentId = extractGid(parentTaskIdOrUrl);
        const payload: Record<string, unknown> = { name };
        if (notes !== undefined) payload.notes = notes;
        if (assignee !== undefined) payload.assignee = assignee;
        if (due_on !== undefined) payload.due_on = due_on;

        const res = await asanaFetch<AsanaTask>(`tasks/${parentId}/subtasks`, {
          method: "POST",
          params: { opt_fields: TASK_FIELDS },
          data: payload,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Subtask created successfully under parent ${parentId}!\n\n${JSON.stringify(res.data, null, 2)}`,
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error creating subtask: ${errorMsg}` }],
        };
      }
    }
  );

  // 7. Move task to section
  server.tool(
    "asana_move_task_section",
    "Move or add an existing task to a specific Section/Column within a project.",
    {
      taskIdOrUrl: z.string().describe("Asana Task GID or URL to move"),
      sectionIdOrUrl: z.string().describe("Target Section GID or URL"),
      insertBefore: z.string().optional().describe("Task GID to insert before"),
      insertAfter: z.string().optional().describe("Task GID to insert after"),
    },
    async ({ taskIdOrUrl, sectionIdOrUrl, insertBefore, insertAfter }) => {
      try {
        const taskId = extractGid(taskIdOrUrl);
        const sectionId = extractGid(sectionIdOrUrl);

        const payload: Record<string, unknown> = { task: taskId };
        if (insertBefore) payload.insert_before = extractGid(insertBefore);
        if (insertAfter) payload.insert_after = extractGid(insertAfter);

        await asanaFetch(`sections/${sectionId}/addTask`, {
          method: "POST",
          data: payload,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully moved task ${taskId} to section ${sectionId}.`,
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error moving task to section: ${errorMsg}` }],
        };
      }
    }
  );
}
