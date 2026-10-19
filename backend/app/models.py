from __future__ import annotations

from sqlalchemy import JSON, Boolean, CheckConstraint, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Continuity(Base):
    __tablename__ = "continuities"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Era(Base):
    __tablename__ = "eras"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    start_year: Mapped[int] = mapped_column(Integer, nullable=False)
    end_year: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)


class Character(Base):
    __tablename__ = "characters"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    real_name: Mapped[str | None] = mapped_column(String)
    aliases: Mapped[list | None] = mapped_column(JSON)
    first_appearance: Mapped[str | None] = mapped_column(String)
    creators: Mapped[list | None] = mapped_column(JSON)
    color: Mapped[str | None] = mapped_column(String)
    emblem: Mapped[str | None] = mapped_column(String)
    bio: Mapped[str | None] = mapped_column(Text)
    marvel_api_id: Mapped[int | None] = mapped_column(Integer)
    comicvine_id: Mapped[int | None] = mapped_column(Integer)
    image_url: Mapped[str | None] = mapped_column(String)
    affiliations: Mapped[list | None] = mapped_column(JSON)

    outgoing: Mapped[list[Relationship]] = relationship(
        back_populates="source", foreign_keys="Relationship.source_id"
    )
    incoming: Mapped[list[Relationship]] = relationship(
        back_populates="target", foreign_keys="Relationship.target_id"
    )


class Relationship(Base):
    __tablename__ = "relationships"
    __table_args__ = (CheckConstraint("source_id <> target_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("characters.id"), nullable=False, index=True)
    target_id: Mapped[str] = mapped_column(ForeignKey("characters.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String, nullable=False)
    continuity_id: Mapped[str] = mapped_column(ForeignKey("continuities.id"), nullable=False, index=True)
    era_id: Mapped[str | None] = mapped_column(ForeignKey("eras.id"))
    label: Mapped[str | None] = mapped_column(String)
    summary: Mapped[str | None] = mapped_column(Text)
    start_issue: Mapped[str | None] = mapped_column(String)
    end_issue: Mapped[str | None] = mapped_column(String)
    start_year: Mapped[int | None] = mapped_column(Integer, index=True)
    end_year: Mapped[int | None] = mapped_column(Integer)

    source: Mapped[Character] = relationship(foreign_keys=[source_id], back_populates="outgoing")
    target: Mapped[Character] = relationship(foreign_keys=[target_id], back_populates="incoming")
    continuity: Mapped[Continuity] = relationship()
    era: Mapped[Era | None] = relationship()
    events: Mapped[list[RelationshipEvent]] = relationship(
        back_populates="relationship_", cascade="all, delete-orphan", order_by="RelationshipEvent.year"
    )


class RelationshipEvent(Base):
    __tablename__ = "relationship_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    relationship_id: Mapped[int] = mapped_column(
        ForeignKey("relationships.id", ondelete="CASCADE"), nullable=False, index=True
    )
    issue: Mapped[str] = mapped_column(String, nullable=False)
    year: Mapped[int | None] = mapped_column(Integer)
    note: Mapped[str | None] = mapped_column(Text)

    relationship_: Mapped[Relationship] = relationship(back_populates="events")
