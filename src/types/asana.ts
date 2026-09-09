export interface AsanaResource {
  gid: string;
  name: string;
  resource_type?: string;
}

export interface AsanaUser extends AsanaResource {
  email?: string;
}

export interface AsanaCustomField {
  gid: string;
  name: string;
  type?: string;
  display_value?: string | null;
  text_value?: string | null;
  number_value?: number | null;
  enum_value?: {
    gid: string;
    name: string;
    color?: string;
    enabled?: boolean;
  } | null;
  multi_enum_values?: Array<{
    gid: string;
    name: string;
    color?: string;
  }>;
}

export interface AsanaSection extends AsanaResource {
  created_at?: string;
}

export interface AsanaTask extends AsanaResource {
  notes?: string;
  html_notes?: string;
  completed?: boolean;
  completed_at?: string | null;
  due_on?: string | null;
  due_at?: string | null;
  start_on?: string | null;
  start_at?: string | null;
  assignee?: AsanaUser | null;
  created_at?: string;
  modified_at?: string;
  tags?: AsanaResource[];
  custom_fields?: AsanaCustomField[];
  memberships?: Array<{
    project?: AsanaResource;
    section?: AsanaSection;
  }>;
  num_subtasks?: number;
  parent?: AsanaResource | null;
  subtasks?: AsanaTask[];
}

export interface AsanaProject extends AsanaResource {
  notes?: string;
  html_notes?: string;
  color?: string | null;
  archived?: boolean;
  created_at?: string;
  modified_at?: string;
  owner?: AsanaUser | null;
  workspace?: AsanaResource;
  team?: AsanaResource;
  members?: AsanaUser[];
  custom_field_settings?: Array<{
    custom_field: AsanaCustomField;
  }>;
}

export interface AsanaProjectExport {
  exported_at: string;
  project: AsanaProject;
  sections: AsanaSection[];
  tasks: AsanaTask[];
}
