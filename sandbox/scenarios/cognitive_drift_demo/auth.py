"""Authentication module — 300 lines to demonstrate cognitive drift demo."""
import hashlib
import hmac
import os
import time
from typing import Optional


SECRET_KEY = os.getenv("JWT_SECRET", "change_me_in_production")
TOKEN_EXPIRY = 3600


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return f"{salt}:{hashed.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, expected = stored_hash.split(":", 1)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
        return hmac.compare_digest(actual.hex(), expected)
    except Exception:
        return False


def generate_token(user_id: str) -> str:
    payload = f"{user_id}:{int(time.time()) + TOKEN_EXPIRY}"
    sig = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"


def verify_token(token: str) -> Optional[str]:
    try:
        parts = token.rsplit(":", 1)
        if len(parts) != 2:
            return None
        payload, sig = parts
        expected = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        user_id, expiry = payload.split(":", 1)
        if int(expiry) < int(time.time()):
            return None
        return user_id
    except Exception:
        return None
# Lines 40-300: additional auth helper functions (truncated for demo)
