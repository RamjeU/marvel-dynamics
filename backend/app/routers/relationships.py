from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..db import get_db

router = APIRouter(tags=["relationships"])

_opts = (
    selectinload(models.Relationship.source), selectinload(models.Relationship.target),
    selectinload(models.Relationship.continuity), selectinload(models.Relationship.era),
    selectinload(models.Relationship.events),
)


@router.get("/relationships", response_model=list[schemas.RelationshipOut])
def list_relationships(continuity: str | None = None, era: str | None = None, type: str | None = None,
                       db: Session = Depends(get_db)):
    stmt = select(models.Relationship).options(*_opts)
    if continuity:
        stmt = stmt.where(models.Relationship.continuity_id == continuity)
    if era:
        stmt = stmt.where(models.Relationship.era_id == era)
    if type:
        stmt = stmt.where(models.Relationship.type == type)
    return list(db.scalars(stmt))


@router.get("/relationships/{rel_id}", response_model=schemas.RelationshipOut)
def get_relationship(rel_id: int, db: Session = Depends(get_db)):
    r = db.scalar(select(models.Relationship).where(models.Relationship.id == rel_id).options(*_opts))
    if not r:
        raise HTTPException(404, "relationship not found")
    return r


@router.get("/continuities", response_model=list[schemas.ContinuityOut])
def list_continuities(db: Session = Depends(get_db)):
    return list(db.scalars(select(models.Continuity).order_by(models.Continuity.is_primary.desc())))


@router.get("/eras", response_model=list[schemas.EraOut])
def list_eras(db: Session = Depends(get_db)):
    return list(db.scalars(select(models.Era).order_by(models.Era.start_year)))
