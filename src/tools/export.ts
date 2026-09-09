import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { asanaFetch, extractGid, fetchAllTasks } from "../client.js";
import type { AsanaProject, AsanaSection, AsanaTask, AsanaProjectExport } from "../types/asana.js";

const TASK_FIELDS =
  "gid,name,notes,html_notes,completed,completed_at,due_on,due_at,start_on,start_at,assignee.name,assignee.email,created_at,modified_at,tags.name,custom_fields,memberships.section.name,memberships.project.name,num_subtasks,parent";

export function registerExportTools(server: McpServer) {
  server.tool(
    "asana_export_project_json",
    "Export complete Asana project structure (details, sections, tasks, subtasks, custom fields) to a JSON file.",
    {
      projectIdOrUrl: z
        .string()
        .describe("Asana Project GID or full URL (e.g. 1215821870584799 or https://app.asana.com/1/.../project/1215821870584799/...)"),
      outputPath: z
        .string()
        .optional()
        .describe("Absolute or relative file path to save the JSON file. Defaults to asana_project_<id>.json in cwd."),
      includeSubtasks: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to recursively fetch subtasks for all tasks (default: true)."),
    },
    async ({ projectIdOrUrl, outputPath, includeSubtasks = true }) => {
      try {
        const projectId = extractGid(projectIdOrUrl);
        if (!projectId) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: Unable to extract valid Project ID from: "${projectIdOrUrl}"`,
              },
            ],
          };
        }

        // 1. Fetch project info
        const projectRes = await asanaFetch<AsanaProject>(`projects/${projectId}`, {
          opt_fields:
            "gid,name,notes,html_notes,color,archived,created_at,modified_at,owner.name,workspace.name,team.name,members.name,custom_field_settings.custom_field",
        });
        const project = projectRes.data;

        // 2. Fetch sections
        const sectionsRes = await asanaFetch<AsanaSection[]>(`projects/${projectId}/sections`, {
          opt_fields: "gid,name,created_at",
        });
        const sections = sectionsRes.data || [];

        // 3. Fetch tasks
        const tasks = await fetchAllTasks<AsanaTask>(projectId, TASK_FIELDS);

        // 4. Fetch subtasks
        let subtasksCount = 0;
        if (includeSubtasks) {
          for (const task of tasks) {
            if (task.num_subtasks && task.num_subtasks > 0) {
              const subRes = await asanaFetch<AsanaTask[]>(`tasks/${task.gid}/subtasks`, {
                opt_fields: TASK_FIELDS,
              });
              task.subtasks = subRes.data || [];
              subtasksCount += task.subtasks.length;
            }
          }
        }

        const exportData: AsanaProjectExport = {
          exported_at: new Date().toISOString(),
          project,
          sections,
          tasks,
        };

        const finalPath = outputPath
          ? path.resolve(outputPath)
          : path.resolve(process.cwd(), `asana_project_${projectId}.json`);

        fs.writeFileSync(finalPath, JSON.stringify(exportData, null, 2), "utf-8");
        const stats = fs.statSync(finalPath);

        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully exported Asana project!\n\n` +
                `- Project Name: ${project.name}\n` +
                `- Project GID: ${projectId}\n` +
                `- Total Sections: ${sections.length}\n` +
                `- Total Top-level Tasks: ${tasks.length}\n` +
                `- Total Subtasks: ${subtasksCount}\n` +
                `- Saved to: ${finalPath}\n` +
                `- File Size: ${(stats.size / 1024).toFixed(2)} KB`,
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Failed to export project: ${errorMsg}` }],
        };
      }
    }
  );
}
