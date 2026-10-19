"""Graph helpers: build node/link payloads and find shortest paths (BFS)."""
from __future__ import annotations

from collections import defaultdict, deque

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from . import models, schemas


def load_relationships(db: Session, continuity: str | None = None, era: str | None = None,
                       rel_type: str | None = None, year: int | None = None,
                       team: str | None = None) -> list[models.Relationship]:
    q = select(models.Relationship).options(
        selectinload(models.Relationship.source), selectinload(models.Relationship.target)
    )
    if continuity:
        q = q.where(models.Relationship.continuity_id == continuity)
    if era:
        q = q.where(models.Relationship.era_id == era)
    if rel_type:
        q = q.where(models.Relationship.type == rel_type)
    if year is not None:
        q = q.where(models.Relationship.start_year <= year).where(
            or_(models.Relationship.end_year.is_(None), models.Relationship.end_year >= year))
    rels = list(db.scalars(q))
    if team:
        rels = [r for r in rels if team in (r.source.affiliations or []) or team in (r.target.affiliations or [])]
    return rels


def to_link(r: models.Relationship) -> schemas.GraphLink:
    return schemas.GraphLink(
        id=r.id, source=r.source_id, target=r.target_id, type=r.type, label=r.label,
        continuity=r.continuity_id, era=r.era_id, start_year=r.start_year, end_year=r.end_year,
    )


def build_graph(rels: list[models.Relationship]) -> schemas.GraphOut:
    degree: dict[str, int] = defaultdict(int)
    chars: dict[str, models.Character] = {}
    for r in rels:
        chars[r.source_id] = r.source
        chars[r.target_id] = r.target
        degree[r.source_id] += 1
        degree[r.target_id] += 1
    nodes = [
        schemas.GraphNode(id=c.id, name=c.name, color=c.color, emblem=c.emblem, degree=degree[c.id],
                          affiliations=c.affiliations)
        for c in chars.values()
    ]
    return schemas.GraphOut(nodes=nodes, links=[to_link(r) for r in rels])


def shortest_path(rels: list[models.Relationship], start: str, goal: str) -> schemas.PathOut:
    """Unweighted BFS over undirected relationship edges."""
    adj: dict[str, list[models.Relationship]] = defaultdict(list)
    chars: dict[str, models.Character] = {}
    for r in rels:
        adj[r.source_id].append(r)
        adj[r.target_id].append(r)
        chars[r.source_id] = r.source
        chars[r.target_id] = r.target
    if start not in chars or goal not in chars:
        return schemas.PathOut(found=False)
    prev: dict[str, tuple[str, models.Relationship] | None] = {start: None}
    queue = deque([start])
    while queue:
        cur = queue.popleft()
        if cur == goal:
            break
        for r in adj[cur]:
            nxt = r.target_id if r.source_id == cur else r.source_id
            if nxt not in prev:
                prev[nxt] = (cur, r)
                queue.append(nxt)
    if goal not in prev:
        return schemas.PathOut(found=False)
    node_ids, links = [goal], []
    cur = goal
    while prev[cur] is not None:
        p, r = prev[cur]
        links.append(to_link(r))
        node_ids.append(p)
        cur = p
    node_ids.reverse()
    links.reverse()
    return schemas.PathOut(
        found=True, degrees=len(links),
        nodes=[schemas.CharacterBrief.model_validate(chars[i]) for i in node_ids], links=links,
    )
