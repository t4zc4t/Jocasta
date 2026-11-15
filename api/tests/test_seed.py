from jocasta.seed import DEMO_EVENTS, DEMO_SOURCE, seed
from jocasta.store import Store


def test_seed_loads_once():
    with Store() as store:
        assert seed(store) == len(DEMO_EVENTS)
        assert seed(store) == 0
        events = store.list_events()
        assert len(events) == len(DEMO_EVENTS)
        assert store.get_source(DEMO_SOURCE).can_redistribute
        assert all("Synthetic" in e.title for e in events)


def test_seed_gives_one_event_history():
    with Store() as store:
        seed(store)
        revised = [e for e in store.list_events() if e.version == 2]
        assert len(revised) == 1
        assert len(store.event_history(revised[0].event_id)) == 2


def test_seed_skips_a_database_with_real_events():
    from datetime import UTC, datetime

    from jocasta.event import Category, Event, Place, PlacePrecision

    with Store() as store:
        store.add_event(
            Event(
                title="Real event",
                category=Category.OTHER,
                place=Place(name="Somewhere", precision=PlacePrecision.REGION),
                started_at=datetime(2025, 1, 1, tzinfo=UTC),
                recorded_at=datetime(2026, 11, 15, tzinfo=UTC),
                recorded_by="importer:test",
            )
        )
        assert seed(store) == 0
        assert store.get_source(DEMO_SOURCE) is None
