from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ContinuityOut(ORM):
    id: str
    name: str
    description: str | None = None
    is_primary: bool


class EraOut(ORM):
    id: str
    name: str
    start_year: int
    end_year: int | None = None
    description: str | None = None


class CharacterBrief(ORM):
    id: str
    name: str
    real_name: str | None = None
    color: str | None = None
    emblem: str | None = None
    image_url: str | None = None


class CharacterOut(CharacterBrief):
    aliases: list[str] | None = None
    first_appearance: str | None = None
    creators: list[str] | None = None
    bio: str | None = None
    affiliations: list[str] | None = None
    marvel_api_id: int | None = None
    comicvine_id: int | None = None


class EventOut(ORM):
    id: int
    issue: str
    year: int | None = None
    note: str | None = None


class RelationshipOut(ORM):
    id: int
    source: CharacterBrief
    target: CharacterBrief
    type: str
    continuity: ContinuityOut
    era: EraOut | None = None
    label: str | None = None
    summary: str | None = None
    start_issue: str | None = None
    end_issue: str | None = None
    start_year: int | None = None
    end_year: int | None = None
    events: list[EventOut] = []


class CharacterDetail(CharacterOut):
    relationships: list[RelationshipOut] = []


class GraphNode(BaseModel):
    id: str
    name: str
    color: str | None = None
    emblem: str | None = None
    degree: int
    affiliations: list[str] | None = None


class GraphLink(BaseModel):
    id: int
    source: str
    target: str
    type: str
    label: str | None = None
    continuity: str
    era: str | None = None
    start_year: int | None = None
    end_year: int | None = None


class GraphOut(BaseModel):
    nodes: list[GraphNode]
    links: list[GraphLink]


class PathOut(BaseModel):
    found: bool
    degrees: int | None = None
    nodes: list[CharacterBrief] = []
    links: list[GraphLink] = []
