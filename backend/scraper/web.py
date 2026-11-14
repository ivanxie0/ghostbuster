"""Thin clients for Bright Data Web Unlocker, the NPI Registry and Gemini. Owner: Ivan.

Every function takes an explicit timeout and raises on failure; callers decide the fallback.
Bright Data REST API (docs.brightdata.com, Web Unlocker): POST https://api.brightdata.com/request
  headers: Authorization: Bearer <API key>
  body:    {"zone": <web unlocker zone>, "url": ..., "format": "raw", "data_format": "markdown"}
"""
import json
import os

import httpx

BRIGHTDATA_URL = "https://api.brightdata.com/request"
NPI_URL = "https://npiregistry.cms.hhs.gov/api/"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


class FetchError(Exception):
    pass


def brightdata_configured() -> bool:
    return bool(os.getenv("BRIGHTDATA_API_TOKEN") and os.getenv("BRIGHTDATA_ZONE"))


def unlock(url: str, timeout: float, markdown: bool = True) -> tuple[int, str]:
    """Fetch a page through Bright Data Web Unlocker. Returns (target_status, body).
    target_status is the target site's HTTP status when Bright Data reports it, else 200."""
    token, zone = os.getenv("BRIGHTDATA_API_TOKEN"), os.getenv("BRIGHTDATA_ZONE")
    if not (token and zone):
        raise FetchError("BRIGHTDATA_API_TOKEN / BRIGHTDATA_ZONE not set")
    body = {"zone": zone, "url": url, "format": "raw", "country": "us"}
    if markdown:
        body["data_format"] = "markdown"
    r = httpx.post(BRIGHTDATA_URL, json=body, timeout=timeout,
                   headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    # Bright Data puts its own failure reason in x-brd-error / x-luminati-error.
    brd_err = r.headers.get("x-brd-error") or r.headers.get("x-luminati-error")
    if r.status_code >= 400 and r.status_code not in (404, 410):
        raise FetchError(f"brightdata {r.status_code}: {brd_err or r.text[:200]}")
    return r.status_code, r.text


def npi_search(timeout: float, **params) -> list[dict]:
    q = {"version": "2.1", "limit": 50, "enumeration_type": "NPI-1", "state": "CA", **params}
    r = httpx.get(NPI_URL, params=q, timeout=timeout)
    r.raise_for_status()
    data = r.json()
    if "Errors" in data:
        raise FetchError(f"npi: {data['Errors']}")
    return data.get("results") or []


def gemini_json(prompt: str, timeout: float):
    """Ask Gemini for a JSON answer. Raises if no key / bad response."""
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise FetchError("GEMINI_API_KEY not set")
    r = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
        params={"key": key},
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0},
        },
        timeout=timeout,
    )
    r.raise_for_status()
    text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text)
