import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asanaFetch, extractGid } from "../client.js";
import type { AsanaSection } from "../types/asana.js";

export function registerSectionTools(server: McpServer) {
  // 1. List project sections
  server.tool(
    "asana_list_project_sections",
    "List all sections/columns in an Asana project (Kanban board or List views).",
    {
      projectIdOrUrl: z.string().describe("Asana Project GID or URL"),
    },
    async ({ projectIdOrUrl }) => {
      try {
        const projectId = extractGid(projectIdOrUrl);
        const res = await asanaFetch<AsanaSection[]>(`projects/${projectId}/sections`, {
          opt_fields: "gid,name,created_at",
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
          content: [{ type: "text" as const, text: `Error listing sections: ${errorMsg}` }],
        };
      }
    }
  );

  // 2. Create section
  server.tool(
    "asana_create_section",
    "Create a new section/column in an Asana project.",
    {
      projectIdOrUrl: z.string().describe("Asana Project GID or URL"),
      name: z.string().describe("The name of the new section (e.g. 'In Review', 'Sprint 2')"),
      insertBefore: z.string().optional().describe("Section GID to insert before"),
      insertAfter: z.string().optional().describe("Section GID to insert after"),
    },
    async ({ projectIdOrUrl, name, insertBefore, insertAfter }) => {
      try {
        const projectId = extractGid(projectIdOrUrl);
        const payload: Record<string, unknown> = { name };
        if (insertBefore) payload.insert_before = extractGid(insertBefore);
        if (insertAfter) payload.insert_after = extractGid(insertAfter);

        const res = await asanaFetch<AsanaSection>(`projects/${projectId}/sections`, {
          method: "POST",
          params: { opt_fields: "gid,name,created_at" },
          data: payload,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Section created successfully!\n\n${JSON.stringify(res.data, null, 2)}`,
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error creating section: ${errorMsg}` }],
        };
      }
    }
  );
}
