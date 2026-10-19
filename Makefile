.PHONY: setup seed api web test export build

setup:            ## install everything (python venv + npm)
	python3 -m venv .venv && . .venv/bin/activate && pip install -r backend/requirements.txt
	cd frontend && npm install

seed:             ## (re)load seed data into backend/marvel.db
	cd backend && ../.venv/bin/python seed.py

api:              ## run the FastAPI backend on :8000 (docs at /docs)
	cd backend && ../.venv/bin/uvicorn app.main:app --reload --port 8000

web:              ## run the Vite dev server on :5173 against the local API
	cd frontend && VITE_API_URL=http://localhost:8000 npm run dev

test:             ## backend tests
	cd backend && ../.venv/bin/python -m pytest -q

export:           ## export DB → frontend/public/data for the static build
	cd backend && ../.venv/bin/python export_static.py

build: export     ## static production build (what GitHub Pages serves)
	cd frontend && npm run build
