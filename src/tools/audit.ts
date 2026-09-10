import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asanaFetch, extractGid, fetchAllTasks } from "../client.js";
import type { AsanaProject, AsanaTask, AsanaStory } from "../types/asana.js";

const AUDIT_TASK_FIELDS =
  "gid,name,notes,completed,completed_at,due_on,assignee.name,created_at,modified_at,memberships.section.name,num_subtasks,parent";

export function registerAuditTools(server: McpServer) {
  server.tool(
    "asana_audit_task_consistency",
    "Collect and format project tasks, subtasks, and discussion timelines to audit logic consistency, requirement drifts, and out-of-date tasks.",
    {
      projectIdOrUrl: z.string().describe("Asana Project GID or URL to audit"),
      includeComments: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include recent comments/stories on tasks (default: true)"),
      onlyOpenTasks: z
        .boolean()
        .optional()
        .default(false)
        .describe("Audit only open/uncompleted tasks (default: false)"),
    },
    async ({ projectIdOrUrl, includeComments = true, onlyOpenTasks = false }) => {
      try {
        const projectId = extractGid(projectIdOrUrl);

        // 1. Fetch project meta
        const projectRes = await asanaFetch<AsanaProject>(`projects/${projectId}`, {
          opt_fields: "gid,name,notes,created_at,modified_at,owner.name",
        });
        const project = projectRes.data;

        // 2. Fetch all tasks
        let tasks = await fetchAllTasks<AsanaTask>(projectId, AUDIT_TASK_FIELDS);
        if (onlyOpenTasks) {
          tasks = tasks.filter((t) => !t.completed);
        }

        // 3. Optionally fetch comments/stories & subtasks for each task
        const enrichedTasks = [];
        for (const task of tasks) {
          let stories: AsanaStory[] = [];
          let subtasks: AsanaTask[] = [];

          if (includeComments) {
            try {
              const storyRes = await asanaFetch<AsanaStory[]>(`tasks/${task.gid}/stories`, {
                opt_fields: "gid,text,type,created_at,created_by.name",
                limit: 10,
              });
              // Filter out system churn stories and keep user comments
              stories = (storyRes.data || []).filter(
                (s) => s.text && s.text.trim().length > 0
              );
            } catch {
              // Ignore story fetch errors gracefully
            }
          }

          if (task.num_subtasks && task.num_subtasks > 0) {
            try {
              const subRes = await asanaFetch<AsanaTask[]>(`tasks/${task.gid}/subtasks`, {
                opt_fields: AUDIT_TASK_FIELDS,
              });
              subtasks = subRes.data || [];
            } catch {
              // Ignore subtask fetch errors gracefully
            }
          }

          enrichedTasks.push({
            gid: task.gid,
            name: task.name,
            section: task.memberships?.[0]?.section?.name || "No Section",
            completed: task.completed,
            assignee: task.assignee?.name || "Unassigned",
            created_at: task.created_at,
            modified_at: task.modified_at,
            due_on: task.due_on,
            description: task.notes || "(No description)",
            subtasks: subtasks.map((st) => ({
              gid: st.gid,
              name: st.name,
              completed: st.completed,
              description: st.notes || "",
            })),
            recent_discussions: stories.map((s) => ({
              author: s.created_by?.name || "Unknown",
              created_at: s.created_at,
              comment: s.text,
            })),
          });
        }

        // Sort tasks chronologically by last modified date descending (newest changes first)
        enrichedTasks.sort((a, b) => {
          const dateA = new Date(a.modified_at || a.created_at || 0).getTime();
          const dateB = new Date(b.modified_at || b.created_at || 0).getTime();
          return dateB - dateA;
        });

        const auditDigest = {
          audit_target: {
            project_id: project.gid,
            project_name: project.name,
            total_tasks_audited: enrichedTasks.length,
            generated_at: new Date().toISOString(),
          },
          chronological_task_timeline: enrichedTasks,
        };

        return {
          content: [
            {
              type: "text" as const,
              text:
                `=== ASANA PROJECT CONSISTENCY & REQUIREMENT AUDIT DIGEST ===\n` +
                `Project: "${project.name}" (ID: ${project.gid})\n` +
                `Total Tasks: ${enrichedTasks.length}\n\n` +
                `Below is the structured chronological digest of tasks, descriptions, subtasks, and discussions.\n` +
                `Use this data to compare newer updates against older task specifications to detect conflicts or outdated requirements:\n\n` +
                JSON.stringify(auditDigest, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error generating audit digest: ${errorMsg}` }],
        };
      }
    }
  );
}
