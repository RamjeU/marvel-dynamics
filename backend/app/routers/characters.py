from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/characters", tags=["characters"])


@router.get("", response_model=list[schemas.CharacterOut])
def list_characters(q: str | None = Query(None, description="search name / real name"),
                    db: Session = Depends(get_db)):
    stmt = select(models.Character).order_by(models.Character.name)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(models.Character.name.ilike(like), models.Character.real_name.ilike(like)))
    return list(db.scalars(stmt))


@router.get("/{character_id}", response_model=schemas.CharacterDetail)
def get_character(character_id: str, continuity: str | None = None, db: Session = Depends(get_db)):
    c = db.get(models.Character, character_id)
    if not c:
        raise HTTPException(404, "character not found")
    stmt = (
        select(models.Relationship)
        .where(or_(models.Relationship.source_id == character_id, models.Relationship.target_id == character_id))
        .options(selectinload(models.Relationship.source), selectinload(models.Relationship.target),
                 selectinload(models.Relationship.continuity), selectinload(models.Relationship.era),
                 selectinload(models.Relationship.events))
    )
    if continuity:
        stmt = stmt.where(models.Relationship.continuity_id == continuity)
    rels = list(db.scalars(stmt))
    out = schemas.CharacterDetail.model_validate(c)
    out.relationships = [schemas.RelationshipOut.model_validate(r) for r in rels]
    return out
