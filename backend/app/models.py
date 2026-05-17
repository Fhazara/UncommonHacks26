from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
import uuid
from datetime import datetime


class ActionType(str, Enum):
    shell_command = "shell_command"
    file_read = "file_read"
    file_write = "file_write"
    dependency_install = "dependency_install"
    network_request = "network_request"
    git_operation = "git_operation"
    plan_message = "plan_message"
    approval_request = "approval_request"


class DecisionType(str, Enum):
    allow = "allow"
    warn = "warn"
    reflect = "reflect"
    block = "block"


class SeverityLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class UserSkillLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class ActionEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    session_id: str = "default_session"
    actor: str = "agent"
    mode: str = "research"
    user_prompt: str = ""
    latest_user_instruction: str = ""
    user_skill_level: UserSkillLevel = UserSkillLevel.intermediate
    agent_stated_plan: str = ""
    agent_explanation: str = ""
    action_type: ActionType
    command: Optional[str] = None
    file_path: Optional[str] = None
    diff: Optional[str] = None
    lines_changed: int = 0
    files_changed_count: int = 0
    package_name: Optional[str] = None
    url: Optional[str] = None
    repo_context: Optional[str] = None
    approval_time_ms: int = 5000
    time_spent_viewing_diff_ms: int = 0
    time_spent_viewing_explanation_ms: int = 0
    diff_viewed: bool = False
    explanation_viewed: bool = False
    scroll_depth_percent: float = 0.0
    keystroke_count: int = 0
    fast_approvals_in_row: int = 0
    sim: bool = False
    metadata: Dict[str, Any] = {}


class PolicyMatch(BaseModel):
    rule_id: str
    rule_name: str
    severity: SeverityLevel
    reason: str
    evidence: str
    safer_alternative: str
    risk_points: int


class CognitiveDriftResult(BaseModel):
    drift_score: int
    approval_speed_flag: bool
    diff_size_flag: bool
    repeated_approval_flag: bool
    low_engagement_flag: bool
    explanation_skipped_flag: bool
    user_understanding_level: str
    reason: str
    recommended_intervention: str


class TeacherExplanation(BaseModel):
    plain_english_summary: str
    why_it_matters: str
    what_could_go_wrong: str
    risk_level: str
    reflection_question: str
    safer_alternative: str
    should_pause_user: bool


class ExportStatus(BaseModel):
    local: bool = False
    snowflake: bool = False
    wafer: bool = False


class DecisionResponse(BaseModel):
    action_id: str
    decision: DecisionType
    mode: str
    enforcement: str
    action_risk_score: int
    cognitive_drift_score: int
    intent_mismatch_score: int
    intervention_score: int
    severity: SeverityLevel
    triggered_rules: List[PolicyMatch]
    teacher_explanation: TeacherExplanation
    reflection_question: Optional[str]
    safer_alternative: Optional[str]
    timestamp: str
    exports: ExportStatus


class ReflectionAnswer(BaseModel):
    action_id: str
    session_id: str
    answer: str
    user_confidence: int = 3


class SandboxRunRequest(BaseModel):
    scenario: str
    mode: str = "research"
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
