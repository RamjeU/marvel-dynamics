"""Load seed/*.json into the database. Idempotent: wipes and reloads.

    python seed.py
"""
import json
from pathlib import Path

from app import models
from app.db import Base, SessionLocal, engine

SEED = Path(__file__).parent / "seed"


def load(name):
    return json.loads((SEED / f"{name}.json").read_text())


def main():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.add_all(models.Continuity(**c) for c in load("continuities"))
        db.add_all(models.Era(**e) for e in load("eras"))
        db.add_all(models.Character(**c) for c in load("characters"))
        db.flush()
        n_rel = n_evt = 0
        for r in load("relationships"):
            events = r.pop("events", [])
            rel = models.Relationship(
                source_id=r["source"], target_id=r["target"], type=r["type"],
                continuity_id=r["continuity"], era_id=r.get("era"), label=r.get("label"),
                summary=r.get("summary"), start_issue=r.get("start_issue"), end_issue=r.get("end_issue"),
            )
            rel.events = [models.RelationshipEvent(**e) for e in events]
            db.add(rel)
            n_rel += 1
            n_evt += len(events)
        db.commit()
    print(f"seeded {len(load('characters'))} characters, {n_rel} relationships, {n_evt} events")


if __name__ == "__main__":
    main()
