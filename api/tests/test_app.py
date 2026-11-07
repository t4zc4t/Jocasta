from datetime import UTC, datetime, timedelta
from uuid import uuid7

import pytest
from fastapi.testclient import TestClient

from jocasta.app import app
from jocasta.claim import Claim, EvidenceLink, Relation
from jocasta.event import Category, Confidence, Event, Place, PlacePrecision
from jocasta.source import Access, Source, SourceKind
from jocasta.store import Store

T0 = datetime(2026, 11, 4, tzinfo=UTC)


@pytest.fixture
def setup(tmp_path, monkeypatch):
    path = tmp_path / "test.db"
    monkeypatch.setenv("JOCASTA_DB", str(path))
    v1 = Event(
        title="Synthetic test event",
        category=Category.OTHER,
        place=Place(name="Example region", precision=PlacePrecision.REGION),
        started_at=T0,
        recorded_at=T0,
        recorded_by="manual",
    )
    v2 = v1.revise(
        recorded_at=T0 + timedelta(days=1),
        recorded_by="manual",
        change_note="second source",
        confidence=Confidence.MEDIUM,
    )
    claim = Claim(source_id="test-source", text="Test claim.", retrieved_at=T0)
    with Store(path) as store:
        store.add_source(
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
        store.add_event(v1)
        store.add_event(v2)
        store.add_claim(claim)
        store.add_link(
            EvidenceLink(
                claim_id=claim.id,
                event_id=v1.event_id,
                relation=Relation.SUPPORTS,
                created_at=T0 + timedelta(days=2),
            )
        )
    return TestClient(app), v1


def test_health():
    response = TestClient(app).get("/health")
    assert response.json()["status"] == "ok"


def test_root_goes_to_docs():
    response = TestClient(app).get("/", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "/docs"


def test_sources(setup):
    client, _ = setup
    assert [s["id"] for s in client.get("/sources").json()] == ["test-source"]


def test_events_latest_and_as_of(setup):
    client, v1 = setup
    assert client.get("/events").json()[0]["version"] == 2
    old = client.get("/events", params={"as_of": "2026-11-04T12:00:00Z"}).json()
    assert old[0]["version"] == 1
    before = client.get("/events", params={"as_of": "2026-11-01T00:00:00Z"}).json()
    assert before == []


def test_single_event(setup):
    client, v1 = setup
    assert client.get(f"/events/{v1.event_id}").json()["confidence"] == "medium"
    past = client.get(
        f"/events/{v1.event_id}", params={"as_of": "2026-11-04T06:00:00+05:30"}
    )
    assert past.json()["version"] == 1


def test_history(setup):
    client, v1 = setup
    versions = client.get(f"/events/{v1.event_id}/history").json()
    assert [v["version"] for v in versions] == [1, 2]


def test_evidence_respects_as_of(setup):
    client, v1 = setup
    assert len(client.get(f"/events/{v1.event_id}/evidence").json()) == 1
    early = client.get(
        f"/events/{v1.event_id}/evidence",
        params={"as_of": "2026-11-05T12:00:00Z"},
    )
    assert early.json() == []


def test_unknown_event_is_404(setup):
    client, _ = setup
    assert client.get(f"/events/{uuid7()}").status_code == 404
    assert client.get(f"/events/{uuid7()}/history").status_code == 404


def test_naive_as_of_is_rejected(setup):
    client, _ = setup
    assert (
        client.get("/events", params={"as_of": "2026-11-04T00:00"}).status_code == 422
    )


def test_api_is_read_only(setup):
    client, v1 = setup
    assert client.post("/events", json={}).status_code == 405
    assert client.delete(f"/events/{v1.event_id}").status_code == 405
