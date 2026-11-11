# Jocasta API

The evidence core. Python, managed with uv.

```
uv sync
uv run pytest
uv run ruff check
```

Run the read-only API on your own machine:

```
uv run uvicorn jocasta.app:app --host 127.0.0.1
```

Then open http://127.0.0.1:8000/docs to try the endpoints. Data goes in
`jocasta.db` next to where you run it (set `JOCASTA_DB` to use another file).

## Real data: UCDP

Jocasta's first real source is the UCDP Georeferenced Event Dataset (CC BY 4.0). Download the CSV version from https://ucdp.uu.se/downloads/, unzip it into `api/data/` (ignored by git), then import a year:

```
uv run python -m jocasta.importers.ucdp data/GEDEvent_v26_1.csv --year 2025
```

Running it again adds nothing new. Positions are rounded to about 11 km on import.
