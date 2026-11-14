"""Env config. Loads .env from the repo root (and backend/.env if present). Owner: Aryan."""
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "backend" / ".env")


def env_bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    return default if v is None or v == "" else v.strip().lower() in ("1", "true", "yes", "on")


DATABASE_URL = os.getenv("DATABASE_URL", "")
FAKE_MODE = env_bool("FAKE_MODE", True)
if not FAKE_MODE and not DATABASE_URL:
    print("[config] FAKE_MODE=false but DATABASE_URL is empty -> forcing FAKE_MODE=true")
    FAKE_MODE = True

# Default false: calls wait for the user's consent click (POST /verify). true = auto-start for curl-only runs.
FAKE_AUTO_VERIFY = env_bool("FAKE_AUTO_VERIFY", False)
FAKE_ENDING = (os.getenv("FAKE_ENDING") or "B").strip().upper()

PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "")
TEAMMATE_PHONES = [p for p in (os.getenv(f"TEAMMATE_PHONE_{i}") for i in (1, 2, 3)) if p]
