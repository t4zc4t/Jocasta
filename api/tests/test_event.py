from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from jocasta.event import Category, Confidence, Event, Place, PlacePrecision

T0 = datetime(2026, 10, 29, tzinfo=UTC)


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


def test_first_version_defaults():
    event = make_event()
    assert event.version == 1
    assert event.supersedes is None
    assert event.confidence is Confidence.UNVERIFIED


def test_revise_keeps_identity_and_links_back():
    first = make_event()
    second = first.revise(
        recorded_at=T0 + timedelta(hours=1),
        recorded_by="manual",
        change_note="second source confirmed the date",
        confidence=Confidence.MEDIUM,
    )
    assert second.event_id == first.event_id
    assert second.record_id != first.record_id
    assert second.version == 2
    assert second.supersedes == first.record_id
    assert second.confidence is Confidence.MEDIUM
    # the old version is untouched
    assert first.confidence is Confidence.UNVERIFIED


def test_revise_needs_a_note():
    with pytest.raises(ValidationError):
        make_event().revise(recorded_at=T0, recorded_by="manual", change_note="")


def test_revise_cant_go_back_in_time():
    with pytest.raises(ValueError):
        make_event().revise(
            recorded_at=T0 - timedelta(days=1),
            recorded_by="manual",
            change_note="late fix",
        )


def test_revise_cant_touch_version_fields():
    with pytest.raises(ValueError):
        make_event().revise(
            recorded_at=T0, recorded_by="manual", change_note="x", version=9
        )


def test_hand_made_v2_needs_supersedes():
    with pytest.raises(ValidationError):
        make_event(version=2, change_note="no link back")


def test_v1_cant_supersede():
    first = make_event()
    with pytest.raises(ValidationError):
        make_event(supersedes=first.record_id)


def test_end_before_start_rejected():
    with pytest.raises(ValidationError):
        make_event(ended_at=T0 - timedelta(days=1))


def test_event_is_frozen():
    with pytest.raises(ValidationError):
        make_event().title = "changed"


def test_place_coordinates_are_coarsened():
    place = Place(
        name="Example city",
        lat=12.345678,
        lon=-45.678912,
        precision=PlacePrecision.CITY,
    )
    assert (place.lat, place.lon) == (12.35, -45.68)


def test_place_needs_both_coordinates():
    with pytest.raises(ValidationError):
        Place(name="Half", lat=1.0, precision=PlacePrecision.CITY)


@pytest.mark.parametrize("code", ["in", "IND", "1N"])
def test_place_rejects_bad_country_codes(code):
    with pytest.raises(ValidationError):
        Place(name="X", country_code=code, precision=PlacePrecision.COUNTRY)
