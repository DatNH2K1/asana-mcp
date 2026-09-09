import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from root of asana-mcp or cwd fallback
dotenv.config({ path: path.join(__dirname, "..", ".env") });
if (!process.env.ASANA_TOKEN && !process.env.ASANA_PAT) {
  dotenv.config({ path: path.join(process.cwd(), ".env") });
}

export function getAsanaToken(): string {
  const token = process.env.ASANA_TOKEN || process.env.ASANA_PAT;
  if (!token) {
    throw new Error(
      "ASANA_TOKEN or ASANA_PAT environment variable is not set. Please set it in your .env file or environment."
    );
  }
  return token;
}

export function extractGid(input: string): string {
  if (!input) return "";
  const str = String(input).trim();

  // Match Asana URLs e.g. project/1215821870584799 or task URL
  const projectMatch = str.match(/project\/(\d+)/);
  if (projectMatch) return projectMatch[1];

  const taskMatch = str.match(/\/(\d+)\/f$/) || str.match(/\/(\d+)$/);
  if (str.startsWith("http") && taskMatch) return taskMatch[1];

  const numericMatch = str.match(/\b\d{10,}\b/);
  if (numericMatch) return numericMatch[0];

  return str;
}

export async function asanaFetch<T>(endpoint: string, params: Record<string, unknown> = {}): Promise<{ data: T; next_page?: { offset: string } }> {
  const token = getAsanaToken();
  const url = new URL(`https://app.asana.com/api/1.0/${endpoint}`);

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) {
      url.searchParams.append(k, String(v));
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Asana API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<{ data: T; next_page?: { offset: string } }>;
}

export async function fetchAllTasks<T>(projectId: string, taskFields: string): Promise<T[]> {
  const allTasks: T[] = [];
  let offset: string | undefined = undefined;

  while (true) {
    const params: Record<string, unknown> = {
      opt_fields: taskFields,
      limit: 100,
    };
    if (offset) params.offset = offset;

    const res = await asanaFetch<T[]>(`projects/${projectId}/tasks`, params);
    const data = res.data || [];
    allTasks.push(...data);

    if (res.next_page && res.next_page.offset) {
      offset = res.next_page.offset;
    } else {
      break;
    }
  }

  return allTasks;
}
