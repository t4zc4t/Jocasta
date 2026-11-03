"""Read-only HTTP API over the store.

Nothing here writes. Records get in through ingestion code, not the web,
so the API can't be used to change history. Run it with:

    uv run uvicorn jocasta.app:app --host 127.0.0.1

It binds to localhost by default and should stay that way.
"""

import os
from collections.abc import Iterator
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import AwareDatetime

from . import __version__
from .claim import EvidenceLink
from .event import Event
from .source import Source
from .store import Store

app = FastAPI(title="Jocasta API", version=__version__)

# only the local dev server may call it from a browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
)


def get_store() -> Iterator[Store]:
    store = Store(os.environ.get("JOCASTA_DB", "jocasta.db"))
    try:
        yield store
    finally:
        store.close()


StoreDep = Annotated[Store, Depends(get_store)]
AsOf = Annotated[
    AwareDatetime | None,
    Query(description="Show what was known at this moment (with timezone)."),
]


def _event_or_404(store: Store, event_id: UUID, as_of: datetime | None) -> Event:
    event = (
        store.event_as_of(event_id, as_of) if as_of else store.latest_event(event_id)
    )
    if event is None:
        raise HTTPException(status_code=404, detail="event not found")
    return event


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}


@app.get("/sources")
def sources(store: StoreDep) -> list[Source]:
    return store.list_sources()


@app.get("/events")
def events(store: StoreDep, as_of: AsOf = None) -> list[Event]:
    return store.list_events(as_of)


@app.get("/events/{event_id}")
def event(event_id: UUID, store: StoreDep, as_of: AsOf = None) -> Event:
    return _event_or_404(store, event_id, as_of)


@app.get("/events/{event_id}/history")
def history(event_id: UUID, store: StoreDep) -> list[Event]:
    versions = store.event_history(event_id)
    if not versions:
        raise HTTPException(status_code=404, detail="event not found")
    return versions


@app.get("/events/{event_id}/evidence")
def evidence(event_id: UUID, store: StoreDep, as_of: AsOf = None) -> list[EvidenceLink]:
    _event_or_404(store, event_id, as_of)
    return store.links_for(event_id, as_of)
