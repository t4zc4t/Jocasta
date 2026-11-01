import sqlite3
from datetime import UTC, datetime, timedelta, timezone

import pytest

from jocasta.claim import Claim, EvidenceLink, Relation
from jocasta.event import Category, Confidence, Event, Place, PlacePrecision
from jocasta.source import Access, Source, SourceKind
from jocasta.store import Store, StoreError

T0 = datetime(2026, 11, 1, tzinfo=UTC)


@pytest.fixture
def store():
    with Store() as s:
        s.add_source(
            Source(
                id="test-source",
                name="Test source",
                kind=SourceKind.DATASET,
                url="https://example.org/",
                licence="CC BY 4.0",
                attribution="Test source",
                access=Access.OPEN,
                added_at=T0,
            )
        )
        yield s


def make_event(**changes):
    data = {
        "title": "Synthetic test event",
        "category": Category.OTHER,
        "place": Place(name="Example region", precision=PlacePrecision.REGION),
        "started_at": T0,
        "recorded_at": T0,
        "recorded_by": "manual",
    }
    data.update(changes)
    return Event(**data)


def make_claim(**changes):
    data = {"source_id": "test-source", "text": "Test claim.", "retrieved_at": T0}
    data.update(changes)
    return Claim(**data)


def test_round_trip(store):
    claim = make_claim()
    store.add_claim(claim)
    assert store.get_claim(claim.id) == claim
    assert store.get_source("test-source").name == "Test source"


def test_duplicate_is_rejected(store):
    claim = make_claim()
    store.add_claim(claim)
    with pytest.raises(StoreError):
        store.add_claim(claim)


def test_claim_needs_known_source(store):
    with pytest.raises(StoreError):
        store.add_claim(make_claim(source_id="nobody"))


@pytest.mark.parametrize(
    "sql",
    [
        "UPDATE sources SET body = '{}'",
        "DELETE FROM sources",
        "UPDATE events SET version = 5",
        "DELETE FROM claims",
    ],
)
def test_database_refuses_changes(store, sql):
    store.add_event(make_event())
    store.add_claim(make_claim())
    with pytest.raises(sqlite3.DatabaseError, match="append-only"):
        with store.db:
            store.db.execute(sql)


def test_versions_and_replay(store):
    v1 = make_event()
    v2 = v1.revise(
        recorded_at=T0 + timedelta(days=1),
        recorded_by="manual",
        change_note="confirmed by a second source",
        confidence=Confidence.MEDIUM,
    )
    store.add_event(v1)
    store.add_event(v2)

    assert store.latest_event(v1.event_id) == v2
    assert store.event_as_of(v1.event_id, T0 + timedelta(hours=12)) == v1
    assert store.event_as_of(v1.event_id, T0 + timedelta(days=2)) == v2
    assert store.event_as_of(v1.event_id, T0 - timedelta(days=1)) is None
    assert [e.version for e in store.event_history(v1.event_id)] == [1, 2]


def test_replay_handles_other_timezones(store):
    # 05:30 in India is midnight UTC, the same moment as T0
    ist = timezone(timedelta(hours=5, minutes=30))
    v1 = make_event()
    store.add_event(v1)
    assert store.event_as_of(v1.event_id, datetime(2026, 11, 1, 5, 30, tzinfo=ist))
    assert not store.event_as_of(v1.event_id, datetime(2026, 11, 1, 5, 29, tzinfo=ist))


def test_revision_must_follow_latest(store):
    v1 = make_event()
    store.add_event(v1)
    v2 = v1.revise(recorded_at=T0, recorded_by="manual", change_note="first fix")
    store.add_event(v2)
    stale = v1.revise(recorded_at=T0, recorded_by="manual", change_note="old base")
    with pytest.raises(StoreError):
        store.add_event(stale)


def test_revision_of_unknown_event_is_rejected(store):
    v2 = make_event().revise(recorded_at=T0, recorded_by="manual", change_note="x")
    with pytest.raises(StoreError):
        store.add_event(v2)


def test_links_and_as_of(store):
    event = make_event()
    store.add_event(event)
    early, late = make_claim(), make_claim()
    store.add_claim(early)
    store.add_claim(late)
    for claim, when in ((early, T0), (late, T0 + timedelta(days=3))):
        store.add_link(
            EvidenceLink(
                claim_id=claim.id,
                event_id=event.event_id,
                relation=Relation.SUPPORTS,
                independent=True,
                created_at=when,
            )
        )
    assert len(store.links_for(event.event_id)) == 2
    assert len(store.links_for(event.event_id, as_of=T0 + timedelta(days=1))) == 1


def test_link_needs_known_event_and_claim(store):
    event = make_event()
    with pytest.raises(StoreError):
        store.add_link(
            EvidenceLink(
                claim_id=make_claim().id,
                event_id=event.event_id,
                relation=Relation.MENTIONS,
                created_at=T0,
            )
        )
    store.add_event(event)
    with pytest.raises(StoreError):
        store.add_link(
            EvidenceLink(
                claim_id=make_claim().id,
                event_id=event.event_id,
                relation=Relation.MENTIONS,
                created_at=T0,
            )
        )


def test_data_survives_reopen(tmp_path):
    path = tmp_path / "jocasta.db"
    event = make_event()
    with Store(path) as s:
        s.add_event(event)
    with Store(path) as s:
        assert s.latest_event(event.event_id) == event
