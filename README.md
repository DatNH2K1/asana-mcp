# Asana MCP Server

Model Context Protocol (MCP) server for Asana built with **TypeScript**, providing automated project export, task management, and seamless integration with AI Assistants (Antigravity, Claude Desktop, Cursor).

## Features

- **`asana_export_project_json`**: Export complete Asana project structure (sections, tasks, subtasks, custom fields) to a JSON file. Accepts either project GID or full URL.
- **`asana_get_project_tasks`**: Retrieve list of tasks with metadata and custom fields from a project.
- **`asana_get_task_details`**: Fetch comprehensive task details including subtasks and stories/comments.
- **`asana_list_workspaces`**: List all accessible Asana workspaces.
- **`asana_list_projects`**: List all projects in a workspace.

## Installation & Build

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build TypeScript**:
   ```bash
   npm run build
   ```

## MCP Configuration

Add the `asana` server to your MCP configuration file (`mcp_config.json`):

```json
{
  "mcpServers": {
    "asana": {
      "command": "node",
      "args": [
        "<path_to_repository>/dist/index.js"
      ],
      "env": {
        "ASANA_TOKEN": "<your_asana_personal_access_token>"
      }
    }
  }
}
```

> **Note**: Replace `<path_to_repository>` with the local path to this repository and `<your_asana_personal_access_token>` with your token generated from the [Asana Developer Console](https://app.asana.com/0/my-apps).

## Development

- Run in development mode with hot execution:
  ```bash
  npm run dev
  ```
- Rebuild production bundle:
  ```bash
  npm run build
  ```
