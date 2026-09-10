# Asana MCP Server

Model Context Protocol (MCP) server for Asana built with **TypeScript**, providing automated project export, task management, and seamless integration with AI Assistants (Antigravity, Claude Desktop, Cursor).

## Features

### 📋 Project Export & Import
- **`asana_export_project_json`**: Export complete Asana project structure (sections, tasks, subtasks, custom fields) to a JSON file. Accepts either project GID or full URL.
- **`asana_import_project_json`**: Import or clone a project from a previously exported JSON file.

### ✅ Task & Subtask Management (CRUD)
- **`asana_get_project_tasks`**: Retrieve list of tasks with metadata and custom fields from a project.
- **`asana_get_task_details`**: Fetch comprehensive task details including subtasks and stories/comments.
- **`asana_create_task`**: Create a new task in Asana under a specified project, section, or workspace.
- **`asana_update_task`**: Update fields of an existing task (name, notes, completed, due dates, assignee).
- **`asana_delete_task`**: Permanently delete a task by its GID or URL.
- **`asana_create_subtask`**: Create a subtask directly under a parent task.
- **`asana_move_task_section`**: Move or add a task to a specific Section/Column within a project.

### 💬 Comments & Discussions
- **`asana_add_comment`**: Post comments or progress updates to a specific task.
- **`asana_get_task_stories`**: Retrieve discussion comments and activity history for a task.

### 📑 Sections & Kanban Boards
- **`asana_list_project_sections`**: List all sections/columns in an Asana project.
- **`asana_create_section`**: Create a new section/column in an Asana project.

### 👥 Users & Workspaces
- **`asana_get_me`**: Get information about the authenticated Asana user/token.
- **`asana_list_workspaces`**: List all accessible Asana workspaces.
- **`asana_list_workspace_users`**: List all members in a workspace to map assignees.
- **`asana_list_projects`**: List all projects in a workspace.

### 🔍 Search & Task Discovery
- **`asana_search_tasks`**: Search tasks across a workspace by keywords, status, assignee, or date range.
- **`asana_get_my_tasks`**: Retrieve active or completed tasks assigned to the authenticated user.

### ⚖️ Consistency & Requirement Drift Audit
- **`asana_audit_task_consistency`**: Collect and format project tasks, subtasks, and discussion timelines to audit logic consistency, requirement drifts, and out-of-date tasks.

## Installation & Build

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build TypeScript**:
   ```bash
   npm run build
   ```

## Obtaining Your Asana Personal Access Token (`ASANA_TOKEN`)

To use this MCP server, you need a Personal Access Token (PAT) from Asana:

1. **Log in to Asana**: Open [app.asana.com](https://app.asana.com) and sign in to your account.
2. **Open Developer Apps Console**:
   - Direct link: Navigate to [https://app.asana.com/0/my-apps](https://app.asana.com/0/my-apps).
   - Or via UI: Click your profile avatar (top-right corner) → **Settings** (or **My Settings**) → **Apps** tab → click **Manage developer apps** (or **Developer console**).
3. **Generate Token**:
   - Scroll down to the **Personal access tokens** section.
   - Click **+ Create new token** (or **+ New access token**).
   - Enter a description for the token (e.g., `asana-mcp-server`).
   - Agree to the API Terms if prompted, then click **Create token**.
4. **Copy the Token**:
   - Copy the generated token immediately and store it securely (Asana will not show it again).
   - Use this value for `ASANA_TOKEN` in your environment or MCP configuration (`mcp_config.json`).

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

> **Note**: Replace `<path_to_repository>` with the local path to this repository and `<your_asana_personal_access_token>` with your Personal Access Token obtained above.

## Development

- Run in development mode with hot execution:
  ```bash
  npm run dev
  ```
- Rebuild production bundle:
  ```bash
  npm run build
  ```
