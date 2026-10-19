import os

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine
from .routers import characters, graph, relationships

Base.metadata.create_all(engine)

app = FastAPI(
    title="Marvel Dynamics API",
    version="0.1.0",
    description="An open database of character relationships across Marvel Comics continuities.",
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

app.include_router(characters.router, prefix="/api")
app.include_router(relationships.router, prefix="/api")
app.include_router(graph.router, prefix="/api")


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/docs")


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/teams")
def teams():
    """Affiliation names with member counts, most common first."""
    from collections import Counter
    from .db import SessionLocal
    from .models import Character
    with SessionLocal() as db:
        c = Counter(t for ch in db.scalars(select(Character)) for t in (ch.affiliations or []))
    return [{"name": n, "count": k} for n, k in c.most_common()]
