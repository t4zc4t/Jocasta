from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from jocasta.source import Access, Source, SourceKind


def make(**changes):
    data = {
        "id": "ucdp",
        "name": "Uppsala Conflict Data Program",
        "kind": SourceKind.DATASET,
        "url": "https://ucdp.uu.se/",
        "licence": "CC BY 4.0",
        "attribution": "Uppsala Conflict Data Program",
        "access": Access.OPEN,
        "added_at": datetime(2026, 10, 27, tzinfo=UTC),
    }
    data.update(changes)
    return Source(**data)


def test_valid_source():
    source = make()
    assert source.kind is SourceKind.DATASET
    assert str(source.url) == "https://ucdp.uu.se/"


def test_redistribution_unknown_means_no():
    assert make().can_redistribute is False
    assert make(allows_redistribution=True).can_redistribute is True


def test_source_is_frozen():
    source = make()
    with pytest.raises(ValidationError):
        source.name = "Something else"


@pytest.mark.parametrize("bad_id", ["UCDP", "ucdp data", "-ucdp", "ucdp-", ""])
def test_rejects_bad_ids(bad_id):
    with pytest.raises(ValidationError):
        make(id=bad_id)


def test_rejects_naive_timestamp():
    with pytest.raises(ValidationError):
        make(added_at=datetime(2026, 10, 27))


def test_rejects_unknown_fields():
    with pytest.raises(ValidationError):
        make(trusted=True)


def test_rejects_bad_url():
    with pytest.raises(ValidationError):
        make(url="not a url")


def test_added_before():
    source = make()
    assert source.added_before(datetime(2026, 11, 1, tzinfo=UTC))
    assert not source.added_before(datetime(2026, 10, 1, tzinfo=UTC))
