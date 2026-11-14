"""Pydantic models — mirror docs/DATA_CONTRACT.md and frontend/lib/types.ts EXACTLY.
Change all three (plus db/schema.sql) together. Owner: Aryan (shared contract)."""
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

PlanType = Literal["hmo", "ppo", "medi_cal", "unknown"]
Specialty = Literal["primary_care", "specialist", "psychiatrist", "therapist"]
AppointmentType = Literal["new", "follow_up", "urgent"]
SearchStatus = Literal["scraping", "verifying", "done"]
GhostStatus = Literal["ghost", "unverified", "available", "violation", "no_answer"]


class SearchCreate(BaseModel):
    insurer: str = Field(min_length=1)
    plan_type: PlanType
    zip: str = Field(pattern=r"^\d{5}$")
    specialty: Specialty
    appointment_type: AppointmentType


class Search(SearchCreate):
    id: str
    created_at: datetime
    status: SearchStatus


class Provider(BaseModel):
    # id/search_id are "" until the glue assigns them (scraper output doesn't know them yet).
    id: str = ""
    search_id: str = ""
    name: str
    specialty: Specialty
    phone: Optional[str] = None
    address: Optional[str] = None
    source_url: Optional[str] = None
    ghost_status: GhostStatus = "unverified"
    ghost_reason: Optional[str] = None
    earliest_date: Optional[date] = None
    business_days_wait: Optional[int] = None
    deadline_days: Optional[int] = None
    violation: bool = False
    call_transcript: Optional[str] = None
    checked_at: Optional[datetime] = None


class SearchCreated(BaseModel):
    search_id: str


class SearchDetail(BaseModel):
    search: Search
    providers: list[Provider]


class VerifyRequest(BaseModel):
    provider_ids: list[str] = Field(min_length=1)


class VerifyResponse(BaseModel):
    started: int
    provider_ids: list[str]


CALL_IN_PROGRESS = "AI call in progress"  # ghost_reason while a call is pending
