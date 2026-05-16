from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    firewall_mode: str = "research"
    allow_ai_evaluator: bool = False
    openai_api_key: str = ""
    gemini_api_key: str = ""
    # Stored as str; parsed to list by get_cors_origins() to avoid pydantic-settings
    # trying to JSON-decode a plain "http://localhost:3000" string.
    cors_origins: str = "http://localhost:3000"

    def get_cors_origins(self) -> list[str]:
        v = self.cors_origins.strip()
        if v.startswith("["):
            import json
            return json.loads(v)
        return [o.strip() for o in v.split(",") if o.strip()]
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
        extra = "ignore"


settings = Settings()
