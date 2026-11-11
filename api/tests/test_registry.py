import pytest
from pydantic import ValidationError

from jocasta.registry import load_sources, register_sources
from jocasta.source import Access, SourceKind
from jocasta.store import Store


def test_ucdp_is_registered_with_its_terms():
    ucdp = {s.id: s for s in load_sources()}["ucdp-ged"]
    assert ucdp.kind is SourceKind.DATASET
    assert ucdp.access is Access.API_KEY
    assert ucdp.licence == "CC BY 4.0"
    assert ucdp.can_redistribute
    assert "Uppsala" in ucdp.attribution


def test_register_only_adds_new_sources():
    with Store() as store:
        first = register_sources(store)
        assert first == len(load_sources())
        assert register_sources(store) == 0


def test_duplicate_ids_are_rejected():
    entry = """
[[source]]
id = "x"
name = "X"
kind = "news"
url = "https://example.org/"
licence = "test"
attribution = "X"
access = "open"
added_at = 2026-11-11T00:00:00Z
"""
    with pytest.raises(ValueError, match="duplicate"):
        load_sources(entry + entry)


def test_bad_entry_fails_loudly():
    with pytest.raises(ValidationError):
        load_sources('[[source]]\nid = "Bad Id"\n')
