# Roadmap

Jocasta is meant to be a free, open source research site for following what is happening in the world, where every conclusion can be traced back to the evidence behind it. This is a long project. The plan below is the order I want to build it in, and it will change as I learn what works.

## How it will run

No paid servers. Scheduled jobs on GitHub Actions fetch data from sources whose terms allow it, check it, and publish versioned data files. The website is static on GitHub Pages and reads those files in the browser with DuckDB-WASM. The same code also runs locally for offline research.

## Where it stands

Done so far:

- dashboard shell with a map, sample records, search and filters (sample data only)
- live deploy to GitHub Pages on every push
- evidence core in Python: sources, claims, evidence links and versioned events
- append-only SQLite store that can replay what was known on any past date
- read-only local API over the store

Nothing real is connected yet. Every record on the site is synthetic.

## Phases

### 1. Evidence core

The base everything else stands on. Sources with their licences, claims, links between claims and events, and full version history. Mostly done.

Still to do: hook the dashboard up to the API, add a source registry file, and write ingestion code that turns raw source data into checked records.

### 2. First real data

Start with one historical dataset whose licence clearly allows reuse, most likely UCDP. Then GDELT for recent event discovery. Each source gets its terms checked first and written into its source record. Rate limits get respected and cached so jobs never hammer anyone.

### 3. Situational picture

Global event map, timelines, regional views, and a freshness and confidence label on everything shown. Duplicate reports collapse into one event, with the original source marked.

### 4. Strategic atlas

Publicly documented, permanent places only: bases, ports, airfields, chokepoints, undersea cables, energy and trade infrastructure. Plus treaties and sanctions. Every entry cites where it came from.

### 5. Observatories

Separate views for conflict, aviation and maritime trends, disasters and humanitarian crises, publicly reported cyber incidents, elections and diplomacy, arms transfers (SIPRI), and economic pressure like trade, commodities and currencies. Aviation and maritime stay at aggregate and historical level.

### 6. Analyst tools

Investigation workspaces, an entity graph of states, organisations and events, before and after satellite comparison from free imagery (Sentinel-2), and a report builder that keeps citations attached.

### 7. Smarter layers

Change detection against regional baselines with a plain reason for every alert, scoring of independent corroboration versus copied reporting, multilingual news clustering, and an optional copilot that runs on a local model. None of this is required for the site to work.

### 8. Forecasting lab

Last on purpose. Regional forecasts tested only on past periods they never saw, compared against a simple baseline, with uncertainty shown and failures reported honestly.

## Research questions

- Can it tell independent corroboration apart from the same report repeated?
- Can regional baselines cut noisy alerts but keep the changes that matter?
- Does putting evidence first make checking claims faster?
- Can past assessments be rebuilt exactly from versioned records?
- Can a forecast beat a plain historical baseline on unseen periods?

## Lines it won't cross

- No tracking of private individuals, no people search.
- No live or actionable military positions, troop movements or unit routes. Only documented permanent sites, history and aggregates.
- Map coordinates are rounded to about a kilometre.
- No country borders are drawn, since many are disputed. Place names don't imply any position on disputed territory.
- Every source is used within its licence, attribution and rate limits. Unknown terms are treated as "no".
- Nothing claims to be official or military grade intelligence.
