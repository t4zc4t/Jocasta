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
