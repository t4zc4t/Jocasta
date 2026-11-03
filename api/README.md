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
