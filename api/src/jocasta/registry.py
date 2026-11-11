"""Loads the source list in sources.toml into the store."""

import tomllib
from importlib.resources import files

from .source import Source
from .store import Store


def load_sources(text: str | None = None) -> list[Source]:
    if text is None:
        text = files("jocasta").joinpath("sources.toml").read_text("utf-8")
    entries = tomllib.loads(text).get("source", [])
    sources = [Source.model_validate(entry) for entry in entries]
    ids = [s.id for s in sources]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate source id in sources.toml")
    return sources


def register_sources(store: Store) -> int:
    """Add any sources the store doesn't have yet. Returns how many were new."""
    added = 0
    for source in load_sources():
        if store.get_source(source.id) is None:
            store.add_source(source)
            added += 1
    return added
