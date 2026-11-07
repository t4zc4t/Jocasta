# Jocasta

A free, open source research site for following what's happening in the world, where every conclusion can be traced back to the evidence behind it.

Live (sample data only for now): https://t4zc4t.github.io/Jocasta/

The name comes from the fictional AI in Marvel. This is an independent project and isn't affiliated with or endorsed by Marvel.

## The idea

Most dashboards show you a dot on a map and expect you to trust it. I want Jocasta to show where every record came from, whether other sources back it up independently or just repeat it, and what was known on any earlier date. Evidence first, everything else after.

## Where it stands

It's early. Nothing real is connected yet, and every record on the site is synthetic.

What works today:

- a dashboard with a world map, sample records, search and filters, deployed to GitHub Pages on every push
- an evidence core in Python with sources, claims, evidence links and versioned events
- an append-only SQLite store that refuses edits and deletes, and can replay what was known at any past moment
- a read-only local API over that store, which the dashboard detects when it's running

The full plan is in [docs/ROADMAP.md](docs/ROADMAP.md).

## Layout

```
web/    the dashboard (React, TypeScript, Vite, MapLibre)
api/    the evidence core and local API (Python, uv, FastAPI, SQLite)
docs/   roadmap and notes
```

## Running it

The dashboard needs Node 24 or newer:

```
cd web
npm install
npm run dev
```

The evidence core needs [uv](https://docs.astral.sh/uv/), which installs the right Python by itself:

```
cd api
uv sync
uv run pytest
uv run uvicorn jocasta.app:app --host 127.0.0.1
```

With both running, the sidebar card on the dashboard shows the API as online. The API docs are at http://127.0.0.1:8000.

## Ground rules

- No tracking of private individuals.
- No live or actionable military positions, only documented permanent sites, history and aggregates.
- No country borders are drawn on the map, since many are disputed, and place names don't imply any position on disputed territory.
- Every source is used within its licence, attribution and rate limits. If the terms aren't confirmed, the data isn't shared.

## License

The code is MIT licensed, see [LICENSE](LICENSE). That doesn't change the terms of any third party data, maps or other material it uses, which keep their own licences.

## Disclaimer

Jocasta is a research project built from public, lawfully accessible information. The data may be incomplete, delayed, wrong or biased. An observation isn't proof of its cause, and a forecast isn't a certainty. Nothing here is official or military grade intelligence.
