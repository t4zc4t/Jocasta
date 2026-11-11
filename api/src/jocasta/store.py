"""Append-only storage on SQLite.

Records go in and never change or leave. The database itself refuses
UPDATE and DELETE, so a bug or a bad script can't quietly rewrite history.
Everything is stored as the model's JSON plus a few columns for lookups.
"""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from pydantic import BaseModel

from .claim import Claim, EvidenceLink
from .event import Event
from .source import Source

SCHEMA = """
CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    added_at TEXT NOT NULL,
    body TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES sources(id),
    retrieved_at TEXT NOT NULL,
    body TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS events (
    record_id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    supersedes TEXT REFERENCES events(record_id),
    recorded_at TEXT NOT NULL,
    body TEXT NOT NULL,
    UNIQUE (event_id, version)
) STRICT;

CREATE TABLE IF NOT EXISTS evidence_links (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL REFERENCES claims(id),
    event_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    body TEXT NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS events_by_event ON events (event_id, recorded_at);
CREATE INDEX IF NOT EXISTS links_by_event ON evidence_links (event_id);
"""

TABLES = ("sources", "claims", "events", "evidence_links")


class StoreError(Exception):
    pass


def _ts(moment: datetime) -> str:
    # always UTC with a fixed width so text order matches time order
    return moment.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def _body(model: BaseModel) -> str:
    return model.model_dump_json()


class Store:
    def __init__(self, path: str | Path = ":memory:") -> None:
        self.db = sqlite3.connect(path, autocommit=True)
        # has to be set outside a transaction or sqlite ignores it
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.autocommit = False
        self._batching = False
        self.db.executescript(SCHEMA)
        for table in TABLES:
            for action in ("UPDATE", "DELETE"):
                self.db.execute(
                    f"""
                    CREATE TRIGGER IF NOT EXISTS no_{action.lower()}_{table}
                    BEFORE {action} ON {table}
                    BEGIN SELECT RAISE(ABORT, '{table} is append-only'); END
                    """
                )
        self.db.commit()

    def close(self) -> None:
        self.db.close()

    def __enter__(self) -> Store:
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    def _insert(self, sql: str, params: tuple) -> None:
        try:
            if self._batching:
                self.db.execute(sql, params)
            else:
                with self.db:
                    self.db.execute(sql, params)
        except sqlite3.IntegrityError as error:
            raise StoreError(str(error)) from error

    @contextmanager
    def batch(self) -> Iterator[None]:
        """Do many writes in one transaction. All of it is kept or none."""
        self._batching = True
        try:
            with self.db:
                yield
        finally:
            self._batching = False

    # writes

    def add_source(self, source: Source) -> None:
        self._insert(
            "INSERT INTO sources VALUES (?, ?, ?)",
            (source.id, _ts(source.added_at), _body(source)),
        )

    def add_claim(self, claim: Claim) -> None:
        self._insert(
            "INSERT INTO claims VALUES (?, ?, ?, ?)",
            (str(claim.id), claim.source_id, _ts(claim.retrieved_at), _body(claim)),
        )

    def add_event(self, event: Event) -> None:
        if event.version > 1:
            latest = self.latest_event(event.event_id)
            if latest is None or latest.record_id != event.supersedes:
                raise StoreError("a revision must supersede the latest version")
        self._insert(
            "INSERT INTO events VALUES (?, ?, ?, ?, ?, ?)",
            (
                str(event.record_id),
                str(event.event_id),
                event.version,
                str(event.supersedes) if event.supersedes else None,
                _ts(event.recorded_at),
                _body(event),
            ),
        )

    def add_link(self, link: EvidenceLink) -> None:
        if self.latest_event(link.event_id) is None:
            raise StoreError("link points at an unknown event")
        self._insert(
            "INSERT INTO evidence_links VALUES (?, ?, ?, ?, ?)",
            (
                str(link.id),
                str(link.claim_id),
                str(link.event_id),
                _ts(link.created_at),
                _body(link),
            ),
        )

    # reads

    def get_source(self, source_id: str) -> Source | None:
        row = self.db.execute(
            "SELECT body FROM sources WHERE id = ?", (source_id,)
        ).fetchone()
        return Source.model_validate_json(row[0]) if row else None

    def get_claim(self, claim_id: UUID) -> Claim | None:
        row = self.db.execute(
            "SELECT body FROM claims WHERE id = ?", (str(claim_id),)
        ).fetchone()
        return Claim.model_validate_json(row[0]) if row else None

    def latest_event(self, event_id: UUID) -> Event | None:
        row = self.db.execute(
            "SELECT body FROM events WHERE event_id = ? ORDER BY version DESC LIMIT 1",
            (str(event_id),),
        ).fetchone()
        return Event.model_validate_json(row[0]) if row else None

    def event_as_of(self, event_id: UUID, moment: datetime) -> Event | None:
        """What we believed about an event at a given moment."""
        row = self.db.execute(
            "SELECT body FROM events WHERE event_id = ? AND recorded_at <= ? "
            "ORDER BY version DESC LIMIT 1",
            (str(event_id), _ts(moment)),
        ).fetchone()
        return Event.model_validate_json(row[0]) if row else None

    def event_history(self, event_id: UUID) -> list[Event]:
        rows = self.db.execute(
            "SELECT body FROM events WHERE event_id = ? ORDER BY version",
            (str(event_id),),
        ).fetchall()
        return [Event.model_validate_json(r[0]) for r in rows]

    def links_for(
        self, event_id: UUID, as_of: datetime | None = None
    ) -> list[EvidenceLink]:
        sql = "SELECT body FROM evidence_links WHERE event_id = ?"
        params: tuple = (str(event_id),)
        if as_of is not None:
            sql += " AND created_at <= ?"
            params += (_ts(as_of),)
        rows = self.db.execute(sql + " ORDER BY created_at", params).fetchall()
        return [EvidenceLink.model_validate_json(r[0]) for r in rows]

    def list_sources(self) -> list[Source]:
        rows = self.db.execute("SELECT body FROM sources ORDER BY id").fetchall()
        return [Source.model_validate_json(r[0]) for r in rows]

    def list_events(self, as_of: datetime | None = None) -> list[Event]:
        """Latest known version of every event, optionally at a past moment."""
        cutoff = _ts(as_of) if as_of else "9999"
        rows = self.db.execute(
            """
            SELECT body FROM events e
            WHERE recorded_at <= :cutoff AND version = (
                SELECT MAX(version) FROM events
                WHERE event_id = e.event_id AND recorded_at <= :cutoff
            )
            ORDER BY event_id
            """,
            {"cutoff": cutoff},
        ).fetchall()
        return [Event.model_validate_json(r[0]) for r in rows]
