"""Load a small set of made-up records so the dashboard has something to show.

Everything here is synthetic and labelled that way. Run it with:

    uv run python -m jocasta.seed

It writes to JOCASTA_DB (default jocasta.db) and does nothing if the demo
source is already there, since the store can't overwrite records anyway.
"""

import os
from datetime import UTC, datetime, timedelta

from .claim import Claim, EvidenceLink, Relation
from .event import Category, Confidence, Event, Place, PlacePrecision
from .source import Access, Source, SourceKind
from .store import Store

DEMO_SOURCE = "jocasta-demo"
T0 = datetime(2026, 11, 1, tzinfo=UTC)

DEMO_EVENTS = [
    ("Synthetic protest report A", Category.PROTEST, "Example region A", -31.0, 25.0),
    (
        "Synthetic port disruption B",
        Category.INFRASTRUCTURE,
        "Example coast B",
        37.0,
        14.0,
    ),
    ("Synthetic flood report C", Category.DISASTER, "Example delta C", 112.0, -12.0),
    ("Synthetic talks announced D", Category.DIPLOMATIC, "Example city D", 71.0, 48.0),
]


def seed(store: Store) -> int:
    if store.get_source(DEMO_SOURCE):
        return 0

    store.add_source(
        Source(
            id=DEMO_SOURCE,
            name="Jocasta demo data",
            kind=SourceKind.RESEARCH,
            url="https://github.com/t4zc4t/Jocasta",
            licence="CC0 1.0 (synthetic, made up for testing)",
            attribution="Jocasta demo data",
            access=Access.OPEN,
            allows_redistribution=True,
            added_at=T0,
            notes="Not real. Exists only to exercise the dashboard.",
        )
    )

    added = 0
    for i, (title, category, place, lon, lat) in enumerate(DEMO_EVENTS):
        when = T0 + timedelta(hours=6 * i)
        event = Event(
            title=title,
            summary="Made-up record for testing. Not a real event.",
            category=category,
            place=Place(name=place, lat=lat, lon=lon, precision=PlacePrecision.REGION),
            started_at=when,
            recorded_at=when,
            recorded_by="seed",
        )
        store.add_event(event)
        added += 1

        claim = Claim(
            source_id=DEMO_SOURCE,
            text=f"Demo claim about {title.lower()}.",
            retrieved_at=when,
        )
        store.add_claim(claim)
        store.add_link(
            EvidenceLink(
                claim_id=claim.id,
                event_id=event.event_id,
                relation=Relation.SUPPORTS,
                independent=True,
                created_at=when,
            )
        )

        # give the first one a second version so history has something in it
        if i == 0:
            store.add_event(
                event.revise(
                    recorded_at=when + timedelta(days=1),
                    recorded_by="seed",
                    change_note="second demo source agreed on the date",
                    confidence=Confidence.MEDIUM,
                )
            )

    return added


if __name__ == "__main__":
    path = os.environ.get("JOCASTA_DB", "jocasta.db")
    with Store(path) as store:
        count = seed(store)
    print(
        f"added {count} demo events to {path}" if count else "demo data already there"
    )
