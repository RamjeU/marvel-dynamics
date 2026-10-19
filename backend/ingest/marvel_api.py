"""Enrich characters from the official Marvel Comics API (developer.marvel.com).

Free tier: register for a key, 1,000 requests/day, non-commercial use, attribution required.
Fills characters.marvel_api_id and characters.image_url (an official thumbnail URL —
we link, we never copy, which keeps the repository free of Marvel's art).

    MARVEL_PUBLIC_KEY=... MARVEL_PRIVATE_KEY=... python -m ingest.marvel_api
"""
import hashlib
import os
import sys
import time

import httpx
from sqlalchemy import select

from app import models
from app.db import SessionLocal

BASE = "https://gateway.marvel.com/v1/public"


def auth_params() -> dict:
    pub, priv = os.getenv("MARVEL_PUBLIC_KEY"), os.getenv("MARVEL_PRIVATE_KEY")
    if not pub or not priv:
        sys.exit("set MARVEL_PUBLIC_KEY and MARVEL_PRIVATE_KEY (free at developer.marvel.com)")
    ts = str(int(time.time()))
    return {"ts": ts, "apikey": pub, "hash": hashlib.md5((ts + priv + pub).encode()).hexdigest()}


def lookup(client: httpx.Client, name: str) -> dict | None:
    r = client.get(f"{BASE}/characters", params={**auth_params(), "nameStartsWith": name, "limit": 5})
    r.raise_for_status()
    results = r.json()["data"]["results"]
    exact = [x for x in results if x["name"].lower() == name.lower()]
    return (exact or results or [None])[0]


def main():
    with SessionLocal() as db, httpx.Client(timeout=20) as client:
        for ch in db.scalars(select(models.Character).where(models.Character.marvel_api_id.is_(None))):
            hit = lookup(client, ch.name)
            if not hit:
                print(f"  no match: {ch.name}")
                continue
            ch.marvel_api_id = hit["id"]
            thumb = hit.get("thumbnail") or {}
            if thumb and "image_not_available" not in thumb.get("path", ""):
                ch.image_url = f"{thumb['path']}/standard_xlarge.{thumb['extension']}"
            print(f"  {ch.name} -> {hit['id']}")
            time.sleep(0.5)
        db.commit()


if __name__ == "__main__":
    main()
