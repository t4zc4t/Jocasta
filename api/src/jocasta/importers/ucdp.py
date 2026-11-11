"""Import events from the UCDP GED CSV download.

Get the file from https://ucdp.uu.se/downloads/ (GED, CSV), unzip it, then:

    uv run python -m jocasta.importers.ucdp GEDEvent_v26_1.csv --year 2025

Each GED row becomes one event, one claim from the ucdp-ged source, and a
link between them. Ids are derived from the GED id and version, so running
the same import twice adds nothing new.

Coordinates are rounded to one decimal (about 11 km). GED goes down to
village level, which is more than this project should show for recent
fighting.
"""

import argparse
import csv
import os
import sys
from collections.abc import Iterable, Iterator
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID, uuid5

from ..claim import Claim, EvidenceLink, Relation
from ..event import Category, Confidence, Event, Place, PlacePrecision, TimePrecision
from ..registry import register_sources
from ..store import Store

SOURCE_ID = "ucdp-ged"
VERSION = "26.1"
NAMESPACE = UUID("6f1c0d0e-5a51-4c0e-9d2a-6a6f63617374")

VIOLENCE = {"1": "State-based", "2": "Non-state", "3": "One-sided"}

# where_prec 1-2 is a place or near it, 3-4 a district or province,
# 5-7 a country or wider
PLACE_PRECISION = {
    "1": PlacePrecision.CITY,
    "2": PlacePrecision.CITY,
    "3": PlacePrecision.REGION,
    "4": PlacePrecision.REGION,
    "5": PlacePrecision.COUNTRY,
    "6": PlacePrecision.COUNTRY,
    "7": PlacePrecision.COUNTRY,
}

# date_prec 1 is the exact day, 2-3 within a week or so, 4 a month, 5 a year
TIME_PRECISION = {
    "1": TimePrecision.DAY,
    "2": TimePrecision.DAY,
    "3": TimePrecision.DAY,
    "4": TimePrecision.MONTH,
    "5": TimePrecision.YEAR,
}


def _id(kind: str, ged_id: str) -> UUID:
    return uuid5(NAMESPACE, f"{SOURCE_ID}:{VERSION}:{kind}:{ged_id}")


def _date(value: str) -> datetime:
    return datetime.strptime(value[:10], "%Y-%m-%d").replace(tzinfo=UTC)


def _coarse(value: str) -> float:
    return round(float(value), 1)


def to_records(
    row: dict[str, str], retrieved_at: datetime
) -> tuple[Event, Claim, EvidenceLink]:
    ged_id = row["id"]
    kind = VIOLENCE.get(row["type_of_violence"], "Organized")
    place_name = row["adm_1"] or row["country"]
    event_id = _id("event", ged_id)

    event = Event(
        event_id=event_id,
        record_id=_id("record", ged_id),
        title=f"{kind} violence in {place_name}, {row['country']}"[:200],
        summary=(
            f"{row['dyad_name']}. Best estimate {row['best']} deaths "
            f"(low {row['low']}, high {row['high']}). UCDP GED {VERSION} "
            f"event {ged_id}."
        )[:2000],
        category=Category.CONFLICT,
        place=Place(
            name=f"{place_name}, {row['country']}",
            lat=_coarse(row["latitude"]),
            lon=_coarse(row["longitude"]),
            precision=PLACE_PRECISION.get(row["where_prec"], PlacePrecision.COUNTRY),
        ),
        started_at=_date(row["date_start"]),
        ended_at=_date(row["date_end"]),
        time_precision=TIME_PRECISION.get(row["date_prec"], TimePrecision.YEAR),
        # coded and checked by UCDP, but we haven't cross-checked it ourselves
        confidence=Confidence.MEDIUM,
        recorded_at=retrieved_at,
        recorded_by=f"importer:{SOURCE_ID}:{VERSION}",
    )
    claim = Claim(
        id=_id("claim", ged_id),
        source_id=SOURCE_ID,
        text=(
            f"UCDP codes {kind.lower()} violence between {row['dyad_name']} "
            f"in {place_name}, {row['country']}, {row['date_start'][:10]} to "
            f"{row['date_end'][:10]}, best estimate {row['best']} deaths."
        )[:1000],
        retrieved_at=retrieved_at,
    )
    link = EvidenceLink(
        id=_id("link", ged_id),
        claim_id=claim.id,
        event_id=event_id,
        relation=Relation.SUPPORTS,
        # one dataset, so on its own it isn't independent corroboration
        independent=None,
        created_at=retrieved_at,
    )
    return event, claim, link


def read_rows(
    lines: Iterable[str],
    years: set[str] | None = None,
    countries: set[str] | None = None,
) -> Iterator[dict[str, str]]:
    for row in csv.DictReader(lines):
        if years and row["year"] not in years:
            continue
        if countries and row["country"] not in countries:
            continue
        yield row


def import_rows(
    store: Store, rows: Iterable[dict[str, str]], retrieved_at: datetime
) -> tuple[int, int]:
    """Returns (added, skipped). Skipped rows are ones already imported."""
    register_sources(store)
    added = skipped = 0
    with store.batch():
        for row in rows:
            event, claim, link = to_records(row, retrieved_at)
            if store.latest_event(event.event_id) is not None:
                skipped += 1
                continue
            store.add_event(event)
            store.add_claim(claim)
            store.add_link(link)
            added += 1
    return added, skipped


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Import UCDP GED events")
    parser.add_argument("csv", type=Path, help="GEDEvent_v26_1.csv")
    parser.add_argument("--year", action="append", help="only this year")
    parser.add_argument("--country", action="append", help="only this country")
    args = parser.parse_args(argv)

    path = os.environ.get("JOCASTA_DB", "jocasta.db")
    now = datetime.now(UTC)
    with args.csv.open(newline="", encoding="utf-8") as lines, Store(path) as store:
        rows = read_rows(
            lines,
            years=set(args.year) if args.year else None,
            countries=set(args.country) if args.country else None,
        )
        added, skipped = import_rows(store, rows, now)
    print(f"added {added} events, skipped {skipped} already there, db {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
