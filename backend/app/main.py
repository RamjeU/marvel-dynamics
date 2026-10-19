import os

from fastapi import FastAPI
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


@app.get("/api/health")
def health():
    return {"ok": True}
