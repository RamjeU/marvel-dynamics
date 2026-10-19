import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import tempfile  # noqa: E402

_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}"

from fastapi.testclient import TestClient  # noqa: E402

import seed  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    seed.main()
    return TestClient(app)


def test_health(client):
    assert client.get("/api/health").json() == {"ok": True}


def test_characters_listed(client):
    chars = client.get("/api/characters").json()
    assert len(chars) >= 18
    assert any(c["id"] == "kitty-pryde" for c in chars)


def test_character_detail_has_relationships(client):
    d = client.get("/api/characters/kitty-pryde").json()
    types = {r["type"] for r in d["relationships"]}
    assert {"romance", "mentorship", "friendship", "rivalry"} <= types


def test_same_pair_differs_by_continuity(client):
    rels = client.get("/api/relationships").json()
    pairs = [(r["source"]["id"], r["target"]["id"], r["continuity"]["id"]) for r in rels]
    assert ("magneto", "rogue", "earth-616") in pairs
    assert ("magneto", "rogue", "earth-295") in pairs


def test_graph_filters_by_continuity(client):
    g616 = client.get("/api/graph", params={"continuity": "earth-616"}).json()
    gall = client.get("/api/graph", params={"continuity": "all"}).json()
    assert len(gall["links"]) > len(g616["links"])
    assert all(l["continuity"] == "earth-616" for l in g616["links"])


def test_shortest_path(client):
    p = client.get("/api/path", params={"source": "destiny", "target": "havok"}).json()
    assert p["found"] and p["degrees"] >= 3
    assert p["nodes"][0]["id"] == "destiny" and p["nodes"][-1]["id"] == "havok"
    assert len(p["links"]) == p["degrees"]


def test_path_not_found_outside_continuity(client):
    # Earth-811 has no seeded relationships at all
    p = client.get("/api/path", params={"source": "wolverine", "target": "storm", "continuity": "earth-811"}).json()
    assert p["found"] is False


def test_year_filter(client):
    g1970 = client.get("/api/graph", params={"continuity": "earth-616", "year": 1970}).json()
    gnow = client.get("/api/graph", params={"continuity": "earth-616"}).json()
    assert 0 < len(g1970["links"]) < len(gnow["links"])
    assert all(l["start_year"] <= 1970 for l in g1970["links"])
    # Pym/Wasp marriage ended 1981: present in 1975, absent in 1990
    ids75 = {(l["source"], l["target"]) for l in client.get("/api/graph", params={"year": 1975}).json()["links"]}
    ids90 = {(l["source"], l["target"]) for l in client.get("/api/graph", params={"year": 1990}).json()["links"]}
    assert ("hank-pym", "wasp") in ids75 and ("hank-pym", "wasp") not in ids90


def test_team_filter_and_teams_endpoint(client):
    teams = client.get("/api/teams").json()
    assert teams[0]["name"] in ("X-Men", "Avengers")
    g = client.get("/api/graph", params={"continuity": "all", "team": "Fantastic Four"}).json()
    names = {n["name"] for n in g["nodes"]}
    assert {"Mister Fantastic", "The Thing"} <= names


def test_root_redirects_to_docs(client):
    r = client.get("/", follow_redirects=False)
    assert r.status_code in (307, 308) and r.headers["location"] == "/docs"


def test_whole_graph_connected(client):
    g = client.get("/api/graph", params={"continuity": "earth-616"}).json()
    adj = {}
    for l in g["links"]:
        adj.setdefault(l["source"], set()).add(l["target"]); adj.setdefault(l["target"], set()).add(l["source"])
    seen, stack = set(), [g["nodes"][0]["id"]]
    while stack:
        n = stack.pop()
        if n in seen: continue
        seen.add(n); stack.extend(adj.get(n, ()))
    assert seen == {n["id"] for n in g["nodes"]}, "every 616 character should be reachable from every other"
