"""Enrich characters from the Comic Vine API (comicvine.gamespot.com/api).

Free key, 200 requests/hour, non-commercial only. Used here for comicvine_id and,
optionally, co-appearance counts that suggest relationships the curated seed is missing.

    COMICVINE_KEY=... python -m ingest.comicvine
"""
import os
import sys
import time

import httpx
from sqlalchemy import select

from app import models
from app.db import SessionLocal

BASE = "https://comicvine.gamespot.com/api"
HEADERS = {"User-Agent": "marvel-dynamics (open-source, non-commercial)"}


def search(client: httpx.Client, key: str, name: str) -> dict | None:
    r = client.get(f"{BASE}/search/", params={
        "api_key": key, "format": "json", "resources": "character", "query": name, "limit": 5,
        "field_list": "id,name,publisher",
    })
    r.raise_for_status()
    hits = [h for h in r.json().get("results", []) if (h.get("publisher") or {}).get("name") == "Marvel"]
    exact = [h for h in hits if h["name"].lower() == name.lower()]
    return (exact or hits or [None])[0]


def main():
    key = os.getenv("COMICVINE_KEY") or sys.exit("set COMICVINE_KEY (free at comicvine.gamespot.com/api)")
    with SessionLocal() as db, httpx.Client(timeout=20, headers=HEADERS) as client:
        for ch in db.scalars(select(models.Character).where(models.Character.comicvine_id.is_(None))):
            hit = search(client, key, ch.name)
            if hit:
                ch.comicvine_id = hit["id"]
                print(f"  {ch.name} -> {hit['id']}")
            else:
                print(f"  no match: {ch.name}")
            time.sleep(18)  # stay comfortably under 200/hour
        db.commit()


if __name__ == "__main__":
    main()
