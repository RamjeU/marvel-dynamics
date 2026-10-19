from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import graph, schemas
from ..db import get_db

router = APIRouter(tags=["graph"])


@router.get("/graph", response_model=schemas.GraphOut)
def get_graph(continuity: str | None = Query("earth-616"), era: str | None = None, type: str | None = None,
              db: Session = Depends(get_db)):
    """Nodes and links for the force-directed view. continuity=all returns every universe."""
    cont = None if continuity in (None, "all") else continuity
    return graph.build_graph(graph.load_relationships(db, cont, era, type))


@router.get("/path", response_model=schemas.PathOut)
def get_path(source: str, target: str, continuity: str | None = Query("earth-616"),
             db: Session = Depends(get_db)):
    """Shortest chain of relationships between two characters ('degrees of Kitty Pryde')."""
    cont = None if continuity in (None, "all") else continuity
    return graph.shortest_path(graph.load_relationships(db, cont), source, target)
