from datetime import UTC, datetime
from pathlib import Path

from jocasta.event import Category, PlacePrecision, TimePrecision
from jocasta.importers.ucdp import import_rows, main, read_rows, to_records
from jocasta.store import Store

SAMPLE = Path(__file__).parent / "data" / "ged_sample.csv"
NOW = datetime(2026, 11, 11, tzinfo=UTC)


def rows(**filters):
    with SAMPLE.open(newline="", encoding="utf-8") as lines:
        return list(read_rows(lines, **filters))


def test_row_becomes_event_claim_and_link():
    event, claim, link = to_records(rows()[0], NOW)
    assert event.category is Category.CONFLICT
    assert event.title == "State-based violence in North province, Testland"
    assert event.place.precision is PlacePrecision.CITY
    assert event.time_precision is TimePrecision.DAY
    assert claim.source_id == "ucdp-ged"
    assert link.claim_id == claim.id and link.event_id == event.event_id
    assert link.independent is None


def test_coordinates_are_coarsened_to_one_decimal():
    event, _, _ = to_records(rows()[0], NOW)
    assert (event.place.lat, event.place.lon) == (12.3, 45.7)


def test_missing_province_falls_back_to_country():
    event, _, _ = to_records(rows()[1], NOW)
    assert event.place.name == "Testland, Testland"
    assert event.place.precision is PlacePrecision.COUNTRY
    assert event.time_precision is TimePrecision.MONTH


def test_filters():
    assert [r["id"] for r in rows(years={"2025"})] == ["2", "3"]
    assert [r["id"] for r in rows(countries={"Otherland"})] == ["3"]


def test_import_is_repeatable():
    with Store() as store:
        assert import_rows(store, rows(), NOW) == (3, 0)
        assert import_rows(store, rows(), NOW) == (0, 3)
        assert len(store.list_events()) == 3
        assert store.get_source("ucdp-ged") is not None


def test_ids_are_stable_across_runs():
    first, _, _ = to_records(rows()[0], NOW)
    again, _, _ = to_records(rows()[0], datetime(2027, 1, 1, tzinfo=UTC))
    assert first.event_id == again.event_id


def test_cli(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("JOCASTA_DB", str(tmp_path / "t.db"))
    assert main([str(SAMPLE), "--year", "2025"]) == 0
    assert "added 2 events" in capsys.readouterr().out
