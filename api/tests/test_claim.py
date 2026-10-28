from datetime import UTC, datetime
from uuid import uuid7

import pytest
from pydantic import ValidationError

from jocasta.claim import Claim, EvidenceLink, Relation

NOW = datetime(2026, 10, 28, 6, 0, tzinfo=UTC)


def make_claim(**changes):
    data = {
        "source_id": "ucdp",
        "text": "Synthetic test claim about an example event.",
        "retrieved_at": NOW,
    }
    data.update(changes)
    return Claim(**data)


def make_link(**changes):
    data = {
        "claim_id": uuid7(),
        "event_id": uuid7(),
        "relation": Relation.SUPPORTS,
        "created_at": NOW,
    }
    data.update(changes)
    return EvidenceLink(**data)


def test_claim_gets_time_ordered_ids():
    first, second = make_claim(), make_claim()
    assert first.id.version == 7
    assert first.id < second.id


def test_claim_is_frozen():
    claim = make_claim()
    with pytest.raises(ValidationError):
        claim.text = "changed"


def test_claim_rejects_publish_after_retrieval():
    with pytest.raises(ValidationError):
        make_claim(published_at=datetime(2026, 10, 29, tzinfo=UTC))


def test_claim_accepts_publish_before_retrieval():
    claim = make_claim(published_at=datetime(2026, 10, 27, tzinfo=UTC))
    assert claim.published_at < claim.retrieved_at


def test_claim_keeps_quotes_short():
    with pytest.raises(ValidationError):
        make_claim(quote="x" * 301)


@pytest.mark.parametrize(
    "field,value",
    [
        ("source_id", "Not An Id"),
        ("language", "English"),
        ("content_hash", "abc123"),
        ("retrieved_at", datetime(2026, 10, 28)),
    ],
)
def test_claim_rejects_bad_values(field, value):
    with pytest.raises(ValidationError):
        make_claim(**{field: value})


def test_link_independent_support_counts():
    assert make_link(independent=True).counts_as_corroboration


@pytest.mark.parametrize(
    "changes",
    [
        {"independent": None},
        {"independent": False},
        {"relation": Relation.CONTRADICTS, "independent": True},
        {"relation": Relation.MENTIONS, "independent": True},
    ],
)
def test_link_other_cases_dont_count(changes):
    assert not make_link(**changes).counts_as_corroboration


def test_link_derived_claim_cant_be_independent():
    with pytest.raises(ValidationError):
        make_link(derived_from=uuid7(), independent=True)


def test_link_claim_cant_derive_from_itself():
    claim_id = uuid7()
    with pytest.raises(ValidationError):
        make_link(claim_id=claim_id, derived_from=claim_id)


def test_link_derived_claim_is_fine_when_not_independent():
    link = make_link(derived_from=uuid7(), independent=False)
    assert not link.counts_as_corroboration
