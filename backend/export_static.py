"""Export the database to static JSON for the zero-server GitHub Pages build.

    python export_static.py            # writes ../frontend/public/data/*.json

The frontend reads these files when VITE_API_URL is unset, so the whole site
can be hosted for free with no backend process at all.
"""
import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

OUT = Path(__file__).resolve().parent.parent / "frontend" / "public" / "data"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    c = TestClient(app)
    chars = c.get("/api/characters").json()
    (OUT / "characters.json").write_text(json.dumps(chars, ensure_ascii=False))
    (OUT / "continuities.json").write_text(json.dumps(c.get("/api/continuities").json(), ensure_ascii=False))
    (OUT / "eras.json").write_text(json.dumps(c.get("/api/eras").json(), ensure_ascii=False))
    (OUT / "teams.json").write_text(json.dumps(c.get("/api/teams").json(), ensure_ascii=False))
    (OUT / "relationships.json").write_text(json.dumps(c.get("/api/relationships").json(), ensure_ascii=False))
    detail_dir = OUT / "characters"
    detail_dir.mkdir(exist_ok=True)
    for ch in chars:
        (detail_dir / f"{ch['id']}.json").write_text(
            json.dumps(c.get(f"/api/characters/{ch['id']}").json(), ensure_ascii=False))
    print(f"exported {len(chars)} characters to {OUT}")


if __name__ == "__main__":
    main()
