import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asanaFetch, extractGid } from "../client.js";
import type { AsanaStory } from "../types/asana.js";

const STORY_FIELDS =
  "gid,text,html_text,type,is_pinned,is_edited,created_at,created_by.name,created_by.email";

export function registerCommentTools(server: McpServer) {
  // 1. Add comment to task
  server.tool(
    "asana_add_comment",
    "Add a comment or discussion update to a specific Asana task.",
    {
      taskIdOrUrl: z.string().describe("Asana Task GID or URL to comment on"),
      text: z.string().describe("Comment text content (plain text)"),
      htmlText: z.string().optional().describe("Optional HTML formatted comment text"),
      isPinned: z.boolean().optional().default(false).describe("Pin the comment to top of the task"),
    },
    async ({ taskIdOrUrl, text, htmlText, isPinned = false }) => {
      try {
        const taskId = extractGid(taskIdOrUrl);
        const payload: Record<string, unknown> = {
          text,
          is_pinned: isPinned,
        };
        if (htmlText) {
          payload.html_text = htmlText;
        }

        const res = await asanaFetch<AsanaStory>(`tasks/${taskId}/stories`, {
          method: "POST",
          params: { opt_fields: STORY_FIELDS },
          data: payload,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Comment added successfully to task ${taskId}!\n\n${JSON.stringify(res.data, null, 2)}`,
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error adding comment: ${errorMsg}` }],
        };
      }
    }
  );

  // 2. Get task stories / comments
  server.tool(
    "asana_get_task_stories",
    "Retrieve discussion comments and activity history for a specific Asana task.",
    {
      taskIdOrUrl: z.string().describe("Asana Task GID or URL"),
      limit: z.number().optional().default(50).describe("Maximum stories/comments to fetch"),
    },
    async ({ taskIdOrUrl, limit = 50 }) => {
      try {
        const taskId = extractGid(taskIdOrUrl);
        const res = await asanaFetch<AsanaStory[]>(`tasks/${taskId}/stories`, {
          opt_fields: STORY_FIELDS,
          limit,
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
          content: [{ type: "text" as const, text: `Error fetching task stories: ${errorMsg}` }],
        };
      }
    }
  );
}
