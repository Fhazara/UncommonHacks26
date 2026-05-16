from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    firewall_mode: str = "research"
    allow_ai_evaluator: bool = False
    openai_api_key: str = ""
    gemini_api_key: str = ""
    cors_origins: List[str] = ["http://localhost:3000"]
    snowflake_enabled: bool = False
    snowflake_account: str = ""
    snowflake_user: str = ""
    snowflake_password: str = ""
    snowflake_warehouse: str = ""
    snowflake_database: str = ""
    snowflake_schema: str = ""
    wafer_enabled: bool = False
    wafer_api_key: str = ""
    wafer_endpoint: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
