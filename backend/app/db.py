"""Neon Postgres access (psycopg 3, sync, one short connection per call). Used only when FAKE_MODE=false.
Owner: Aryan (glue). Schema: db/schema.sql (Ivan)."""
import psycopg
from psycopg.rows import dict_row

from app.config import DATABASE_URL
from app.models import Provider, Search, SearchCreate

SEARCH_COLS = "id::text, insurer, plan_type, zip, specialty, appointment_type, prior_appointment_date, created_at, status"
PROVIDER_COLS = (
    "id::text, search_id::text, name, specialty, phone, address, source_url, ghost_status, ghost_reason, "
    "earliest_date, business_days_wait, deadline_days, violation, call_transcript, checked_at"
)


def connect():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=5)


def insert_search(req: SearchCreate) -> str:
    with connect() as c:
        row = c.execute(
            "INSERT INTO searches (insurer, plan_type, zip, specialty, appointment_type, prior_appointment_date) "
            "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id::text",
            (req.insurer, req.plan_type, req.zip, req.specialty, req.appointment_type, req.prior_appointment_date),
        ).fetchone()
        return row["id"]


def get_search(search_id: str) -> Search | None:
    with connect() as c:
        row = c.execute(f"SELECT {SEARCH_COLS} FROM searches WHERE id = %s", (search_id,)).fetchone()
        return Search(**row) if row else None


def get_providers(search_id: str) -> list[Provider]:
    with connect() as c:
        rows = c.execute(
            f"SELECT {PROVIDER_COLS} FROM providers WHERE search_id = %s ORDER BY name", (search_id,)
        ).fetchall()
        return [Provider(**r) for r in rows]


def get_provider(provider_id: str) -> Provider | None:
    with connect() as c:
        row = c.execute(f"SELECT {PROVIDER_COLS} FROM providers WHERE id = %s", (provider_id,)).fetchone()
        return Provider(**row) if row else None


def insert_providers(search_id: str, providers: list[Provider]) -> None:
    with connect() as c:
        for p in providers:
            c.execute(
                "INSERT INTO providers (search_id, name, specialty, phone, address, source_url, ghost_status, ghost_reason) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (search_id, p.name, p.specialty, p.phone, p.address, p.source_url, p.ghost_status, p.ghost_reason),
            )


def update_provider(p: Provider) -> None:
    with connect() as c:
        c.execute(
            "UPDATE providers SET ghost_status=%s, ghost_reason=%s, earliest_date=%s, business_days_wait=%s, "
            "deadline_days=%s, violation=%s, call_transcript=%s, checked_at=now() WHERE id=%s",
            (p.ghost_status, p.ghost_reason, p.earliest_date, p.business_days_wait, p.deadline_days,
             p.violation, p.call_transcript, p.id),
        )


def set_status(search_id: str, status: str) -> None:
    with connect() as c:
        c.execute("UPDATE searches SET status=%s WHERE id=%s", (status, search_id))


def insert_authorization(search_id: str, provider_count: int) -> None:
    with connect() as c:
        c.execute("INSERT INTO authorizations (search_id, provider_count) VALUES (%s, %s) ON CONFLICT (search_id) DO NOTHING",
                  (search_id, provider_count))


def get_authorization(search_id: str):
    with connect() as c:
        row = c.execute("SELECT authorized_at FROM authorizations WHERE search_id = %s", (search_id,)).fetchone()
        return row["authorized_at"] if row else None
