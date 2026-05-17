from pydantic import BaseModel, Field
from typing import Optional, Literal, Any
from datetime import datetime
import uuid


class TaskCompletionCondition(BaseModel):
    type: Literal["tests_pass", "file_exists", "signal"]
    test_command: Optional[str] = None
    file_path: Optional[str] = None
    required_pass_count: Optional[int] = None


class EndConditions(BaseModel):
    time_limit_seconds: Optional[int] = None
    task_completion: Optional[TaskCompletionCondition] = None
    manual: bool = True


class ExperimentCreate(BaseModel):
    nl_description: str
    starter_code_source: Literal["github", "upload", "none"] = "none"
    github_url: Optional[str] = None
    github_token: Optional[str] = None
    anthropic_api_key: str
    model: str = "claude-sonnet-4-6"


class ParsedExperimentConfig(BaseModel):
    task_name: str
    task_description: str
    judge_persona: str
    judge_system_prompt: str
    end_conditions: EndConditions
    active_interventions: dict[str, Any] = Field(default_factory=dict)


class ExperimentStatus(BaseModel):
    experiment_id: str
    status: Literal["created", "provisioning", "running", "stopping", "completed", "failed"]
    container_id: Optional[str] = None
    vscode_port: Optional[int] = None
    vscode_url: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    error: Optional[str] = None


class ExperimentSummary(BaseModel):
    experiment_id: str
    task_name: str
    status: str
    created_at: datetime
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    nl_description: str


class TelemetryEvent(BaseModel):
    event_type: Literal[
        "file_edit",
        "terminal_command",
        "test_result",
        "focus_change",
        "diff_view",
        "response_timing",
        "task_completion_signal",
        "agent_output",
        "human_edit_of_agent_code",
        "override",
        "judge_interaction",
        "session_snapshot",
        "scroll_depth",
    ]
    timestamp: datetime
    session_id: str
    data: dict[str, Any]


class TelemetryBatch(BaseModel):
    events: list[TelemetryEvent]


class GithubStarterCode(BaseModel):
    github_url: str
    branch: str = "main"
    github_token: Optional[str] = None
