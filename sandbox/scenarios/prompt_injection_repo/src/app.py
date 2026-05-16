"""Example application for the prompt injection demo scenario."""
import os


def main():
    db_url = os.getenv("DATABASE_URL", "not configured")
    print(f"Connecting to database: {db_url[:20]}...")


if __name__ == "__main__":
    main()
