# Marvel Dynamics

An open, free database of character relationships across Marvel Comics continuities, with an
interactive graph for exploring who loves, hates, mentors and betrays whom — and how that changes
between Earth-616, the Age of Apocalypse, the Ultimate universe and beyond.

The premise: a relationship is not a fact about two characters, it is a fact about two characters
**in a continuity, in an era, with a paper trail**. Magneto and Rogue had a brief romance in the
Savage Land (Uncanny X-Men #274–275, 1991) and a marriage with a son in Earth-295. Both are true.
The schema is built so both can be stored, queried and drawn.

**Everything in this project runs on free tiers only.** No paid service is required at any step.

## Features

- Force-directed relationship graph with hover isolation and path highlighting
- **Year scrubber**: drag to any year since 1939 and see only the relationships that existed then
- Filters by continuity, era, team affiliation and relationship type
- Degrees-of-separation finder (BFS shortest path) between any two characters
- Character panels with bios, team chips, and per-relationship timelines citing the issue for every turning point
- Runs with no backend at all (static JSON) or against the FastAPI service

## What's here

| Layer | Choice | Why |
|---|---|---|
| Database | SQLite by default, PostgreSQL-compatible schema (`backend/schema.sql`) | Zero cost, ships in the repo, recursive CTEs handle graph queries; swap `DATABASE_URL` for Postgres (e.g. Neon/Supabase free tiers) when the data outgrows a file |
| API | FastAPI + SQLAlchemy 2 | Typed, auto-documented at `/docs`, trivial to test |
| Graph | Pure-Python BFS for shortest paths; node/link payloads for the UI | Simple, correct, easy to explain in an interview |
| Frontend | React 18 + Vite + `react-force-graph-2d` | Force-directed graph as the hero view; conventional panels for browsing |
| Hosting | GitHub Pages via Actions | Free, permanent, no sleeping server. The frontend reads JSON exported from the DB, so no backend runs in production |
| Images | Generated emblems (colour + glyph), optional links to Marvel API thumbnails | The repo ships **no copyrighted art**. See "Images" below |
| Data sources | Hand-curated seed + optional enrichment from the Marvel Comics API and Comic Vine (both free, non-commercial) | |

Current data: **65 characters, 123 relationships, 271 sourced turning points** across the X-Men,
Spider-Man, Avengers, Fantastic Four, street-level and cosmic clusters, plus Earth-295, Earth-1610 and
Earth-811 contrasts. Every Earth-616 character is reachable from every other (there is a test for it).
Expanding is a data problem, not an architecture problem.

## Run it locally

```bash
make setup      # python venv + npm install
make seed       # loads backend/seed/*.json into backend/marvel.db
make api        # http://localhost:8000  (interactive docs at /docs)
make web        # http://localhost:5173  (in a second terminal)
make test       # 11 backend tests
```

Without `make`:

```bash
cd backend && python3 -m venv ../.venv && source ../.venv/bin/activate
pip install -r requirements.txt && python seed.py
uvicorn app.main:app --reload --port 8000
# second terminal
cd frontend && npm install && VITE_API_URL=http://localhost:8000 npm run dev
```

## Static mode (how production works)

```bash
make build      # export DB → frontend/public/data/*.json, then vite build → frontend/dist
```

When `VITE_API_URL` is unset the frontend reads those JSON files instead of calling an API, and
does graph filtering and path-finding in the browser. That is what GitHub Pages serves.

## Deploy for free

1. Push this repo to GitHub.
2. Settings → Pages → Source: **GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/deploy-pages.yml` seeds the DB, runs the tests,
   exports the JSON, builds the site and publishes it at `https://<you>.github.io/<repo>/`.

If you later want a live API (for user contributions, say), Render and Fly.io both have free web-service
tiers and Neon/Supabase have free Postgres; set `DATABASE_URL` and `CORS_ORIGINS` on the backend and
`VITE_API_URL` on the frontend build. Nothing in the code changes.

## API

| Endpoint | Returns |
|---|---|
| `GET /api/characters?q=` | character list, optional search |
| `GET /api/characters/{id}?continuity=` | character with all relationships and turning points |
| `GET /api/relationships?continuity=&era=&type=` | relationship list |
| `GET /api/continuities`, `GET /api/eras` | reference tables |
| `GET /api/graph?continuity=earth-616&era=&type=&team=&year=` | `{nodes, links}` for the force graph (`continuity=all` for every universe; `year=1985` shows only relationships active that year; `team=Avengers` restricts to one affiliation) |
| `GET /api/teams` | affiliations with member counts |
| `GET /api/path?source=destiny&target=havok&continuity=` | shortest chain of relationships (BFS) |

## Data model

```
characters ──< relationships >── characters
                  │  (type, continuity, era, label, summary, start/end issue)
                  └──< relationship_events (issue, year, note)
continuities, eras: reference tables
```

Relationship types: `romance`, `friendship`, `rivalry`, `family`, `mentorship`, `alliance`, `enmity`.
A pair can have several rows (one per continuity and type). `schema.sql` includes the recursive-CTE
version of the reachability query for anyone who asks why this isn't in Neo4j.

## Adding data

Edit `backend/seed/relationships.json` — every relationship needs a `continuity`, a `type`, a `label`,
a `summary` in your own words, and at least one event with an issue citation. Run `make seed && make test`.
Pull requests that add relationships without issue citations will be asked for them.

Optional enrichment (both free, both non-commercial-only):

```bash
MARVEL_PUBLIC_KEY=… MARVEL_PRIVATE_KEY=… python -m ingest.marvel_api   # developer.marvel.com, 1,000 req/day
COMICVINE_KEY=… python -m ingest.comicvine                              # comicvine.gamespot.com/api, 200 req/hour
```

## Images

Character art is Marvel's copyright and is not distributed here. Each character has a generated
emblem (a colour and a glyph) that is consistent across the UI. `ingest/marvel_api.py` can fill
`image_url` with an official thumbnail URL from Marvel's API; if you show those, keep the attribution
line Marvel's terms require ("Data provided by Marvel. © 2014 Marvel").

## Roadmap

- Expand Earth-616 beyond the X-Men: Spider-Man family, Avengers, Fantastic Four
- Contribution flow: a form that opens a pull request against the seed files
- Co-appearance mining from Comic Vine issue credits to suggest missing edges

## Licence

Code: MIT. Data in `backend/seed/`: CC BY-SA 4.0. Unofficial, non-commercial fan project; Marvel
characters are trademarks of Marvel Characters, Inc.
