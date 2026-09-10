# Changelog

All notable changes to this project will be documented in this file.

## main

### Overview
- Expanded the Asana MCP server with comprehensive CRUD capabilities, discussion interactions, section management, user resolution, task search, project JSON import, and requirement drift / out-of-date task consistency auditing.

### NEW FEATURES
- **Task Management**: Added `asana_create_task`, `asana_update_task`, `asana_delete_task`, `asana_create_subtask`, and `asana_move_task_section`.
- **Comments & Activity**: Added `asana_add_comment` and `asana_get_task_stories` for task discussion interactions.
- **Section & Board Management**: Added `asana_list_project_sections` and `asana_create_section`.
- **Users & Workspaces**: Added `asana_get_me` and `asana_list_workspace_users`.
- **Search & Discovery**: Added `asana_search_tasks` and `asana_get_my_tasks`.
- **Project Import**: Added `asana_import_project_json` to clone or restore exported project structures.
- **Consistency & Requirement Drift Audit**: Added `asana_audit_task_consistency` to inspect chronological task updates, subtasks, and discussions for outdated specifications and semantic conflicts.

### IMPROVEMENTS
- Upgraded `asanaFetch` in `src/client.ts` to support standard HTTP methods (`GET`, `POST`, `PUT`, `DELETE`) with JSON payload and query parameters.
- Updated `README.md` documentation with full feature breakdown.

