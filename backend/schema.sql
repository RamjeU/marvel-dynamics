-- Marvel Dynamics — relational schema
-- Written to run unchanged on SQLite (default, zero-cost) and PostgreSQL.
-- The ORM in app/models.py mirrors this exactly; this file is the human-readable contract.

CREATE TABLE continuities (
    id          TEXT PRIMARY KEY,        -- 'earth-616'
    name        TEXT NOT NULL,
    description TEXT,
    is_primary  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE eras (
    id          TEXT PRIMARY KEY,        -- 'claremont'
    name        TEXT NOT NULL,
    start_year  INTEGER NOT NULL,
    end_year    INTEGER,                 -- NULL = ongoing
    description TEXT
);

CREATE TABLE characters (
    id               TEXT PRIMARY KEY,   -- slug: 'kitty-pryde'
    name             TEXT NOT NULL,      -- codename as commonly used
    real_name        TEXT,
    aliases          TEXT,               -- JSON array
    first_appearance TEXT,
    creators         TEXT,               -- JSON array
    color            TEXT,               -- hex, for the generated emblem (no copyrighted art shipped)
    emblem           TEXT,               -- 1–2 glyphs for the emblem
    bio              TEXT,
    marvel_api_id    INTEGER,            -- optional, filled by ingest/marvel_api.py
    comicvine_id     INTEGER,            -- optional, filled by ingest/comicvine.py
    image_url        TEXT                -- optional external URL (Marvel API thumbnail, with attribution)
);

-- One row per (pair, continuity, type). The same two characters can have
-- several rows: Magneto/Rogue have a 616 romance AND an Earth-295 marriage.
CREATE TABLE relationships (
    id             INTEGER PRIMARY KEY,
    source_id      TEXT NOT NULL REFERENCES characters(id),
    target_id      TEXT NOT NULL REFERENCES characters(id),
    type           TEXT NOT NULL,        -- romance | friendship | rivalry | family | mentorship | alliance | enmity
    continuity_id  TEXT NOT NULL REFERENCES continuities(id),
    era_id         TEXT REFERENCES eras(id),   -- era in which the relationship is first established
    label          TEXT,                 -- short headline: 'Friends turned ideological rivals'
    summary        TEXT,                 -- the curated prose
    start_issue    TEXT,
    end_issue      TEXT,                 -- NULL = ongoing
    CHECK (source_id <> target_id)
);
CREATE INDEX ix_rel_source ON relationships(source_id);
CREATE INDEX ix_rel_target ON relationships(target_id);
CREATE INDEX ix_rel_continuity ON relationships(continuity_id);

-- Turning points inside a relationship, each tied to an issue.
CREATE TABLE relationship_events (
    id              INTEGER PRIMARY KEY,
    relationship_id INTEGER NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    issue           TEXT NOT NULL,
    year            INTEGER,
    note            TEXT
);
CREATE INDEX ix_evt_rel ON relationship_events(relationship_id);

-- Example graph query, portable SQL (recursive CTE): every character within N hops of :start
-- inside one continuity. The API's /path endpoint does the same in Python with a BFS,
-- but this is the version to show someone who asks "why not a graph database?".
--
-- WITH RECURSIVE reach(id, depth) AS (
--     SELECT :start, 0
--     UNION
--     SELECT CASE WHEN r.source_id = reach.id THEN r.target_id ELSE r.source_id END, reach.depth + 1
--     FROM reach JOIN relationships r
--       ON (r.source_id = reach.id OR r.target_id = reach.id)
--     WHERE r.continuity_id = :continuity AND reach.depth < :max_depth
-- )
-- SELECT id, MIN(depth) AS degrees FROM reach GROUP BY id ORDER BY degrees;
