export type ExperimentStatus =
  | "created"
  | "provisioning"
  | "running"
  | "stopping"
  | "completed"
  | "failed";

export interface TaskCompletionCondition {
  type: "tests_pass" | "file_exists" | "signal";
  test_command?: string;
  file_path?: string;
  required_pass_count?: number;
}

export interface EndConditions {
  time_limit_seconds?: number;
  task_completion?: TaskCompletionCondition;
  manual: boolean;
}

export interface ExperimentSummary {
  experiment_id: string;
  task_name: string;
  status: ExperimentStatus;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  nl_description: string;
}

export interface ExperimentDetail {
  experiment_id: string;
  status: ExperimentStatus;
  nl_description: string;
  parsed_config: string;
  model: string;
  starter_code_source: "github" | "upload" | "none";
  github_url?: string;
  container_id?: string;
  vscode_port?: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  error?: string;
}

export interface ParsedConfig {
  task_name: string;
  task_description: string;
  judge_persona: string;
  judge_system_prompt: string;
  end_conditions: EndConditions;
  active_interventions: Record<string, boolean>;
}

export interface TelemetryEvent {
  id: string;
  experiment_id: string;
  session_id: string;
  event_type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface TelemetryResponse {
  events: TelemetryEvent[];
  count: number;
}

export interface EngagementSummary {
  avg_response_time_ms: number | null;
  edit_rate: number | null;
  avg_diff_scroll_depth_pct: number | null;
  override_count: number;
  agent_output_count: number;
  human_edit_count: number;
}

export interface AgencySummary {
  human_lines: number;
  agent_lines: number;
  human_initiated_tasks: number;
  agent_initiated_tasks: number;
  total_overrides: number;
}

export interface ExperimentStartResponse {
  experiment_id: string;
  status: ExperimentStatus;
  container_id?: string;
  vscode_port?: number;
  vscode_url?: string;
  started_at?: string;
}

export interface CreateExperimentPayload {
  nl_description: string;
  starter_code_source: "github" | "upload" | "none";
  github_url?: string;
  github_token?: string;
  anthropic_api_key: string;
  model?: string;
}
