# Jocasta

**Global Strategic Intelligence Research Workstation**

Jocasta is a planned, free-first, open-source research workstation for exploring global events, public strategic infrastructure, documented military capabilities, aviation and maritime trends, and geopolitical developments through traceable evidence.

Inspired by the fictional AI Jocasta from Marvel, this is an independent software project and is not affiliated with or endorsed by Marvel.

Its core principle is simple:

**Every important conclusion should lead back to the evidence that supports it.**

Jocasta aims to help users investigate what changed, understand where information came from, inspect conflicting reports, and reconstruct what was known at an earlier point in time.

> **Project status:** Initial development. The repository has been initialized, but implementation has not begun. Features described here are goals, not claims about existing functionality.

## Project Vision

Build a global intelligence research workstation that combines:

- A global overview with regional investigations.
- A strategic atlas of publicly documented permanent military installations and important infrastructure.
- A reference library of publicly documented military equipment and historical capabilities.
- Aviation and maritime monitoring using permitted public data.
- Geopolitical and conflict-event monitoring.
- An evidence engine connecting claims, sources, events, entities, and locations.
- Explainable change detection and historical replay.
- An optional experimental predictor, developed only after the core system is working.

Jocasta prioritizes trustworthy evidence, useful context, reproducible research, security, and honest uncertainty over alert volume or unsupported conclusions.

## Planned Capabilities

### 1. Global Overview

- Explore reported events and regional trends on an interactive world map.
- Move from a global view into a detailed regional investigation.
- Filter by location, topic, source, and time period.
- Display source coverage, update times, and data gaps.
- Distinguish newly observed information from older records.

Global coverage will be best-effort. Public datasets do not provide complete or uniformly reliable coverage of every region.

### 2. Strategic Atlas

Catalogue publicly documented permanent military installations and relevant strategic infrastructure.

Potential categories include:

- Publicly documented military bases and installations.
- Major naval facilities and ports.
- Military airfields and publicly documented aviation facilities.
- Major transport corridors and logistics infrastructure.
- Energy facilities and other strategically relevant infrastructure.
- Publicly documented space infrastructure and historical sites.

Each record should preserve its source references, last verification date, geographic precision, and known uncertainties.

A known location does not prove that a facility is currently active, occupied, ready, or hosting particular equipment.

### 3. Public Asset Registry

Build a searchable reference library covering publicly documented military capabilities.

Potential records include:

- Aircraft, naval vessel classes, armored vehicles, and other equipment categories.
- Service branches and publicly reported force structure.
- Publicly reported procurement and modernization programmes.
- Historical inventory figures and documented capability changes.
- Source-backed specifications and reporting dates.

The registry must distinguish official figures, estimates, historical information, and unverified claims.

It will not attempt to expose actionable real-time military asset positions, unit routes, troop locations, force concentrations, or operational vulnerabilities.

### 4. Aviation Observatory

Explore aviation information through data sources whose access terms permit the intended use.

Potential functionality:

- Historical and permitted flight observations.
- Broad traffic patterns and regional trends.
- Changes relative to historical baselines.
- Source freshness and coverage information.
- Clear handling of missing or incomplete observations.

A missing aircraft observation must not automatically be interpreted as proof that an aircraft is absent.

### 5. Maritime Observatory

Explore permitted maritime information, shipping patterns, port activity, and historical or aggregated vessel trends.

The application must respect the licensing, attribution, authentication, and rate-limit requirements of every source.

Observed movement is not proof of its cause. Any interpretation must remain distinct from the underlying observation.

### 6. Geopolitical and Conflict Monitoring

Combine eligible public reporting, structured event data, and historical context to investigate developments such as:

- Reported conflicts and political violence.
- Diplomatic developments.
- Protests and major public events.
- Infrastructure disruptions and disasters.
- Humanitarian developments.
- Broad aviation and maritime trends relevant to regional context.

Jocasta must not infer military escalation solely from unusual traffic, proximity to an installation, increased news volume, or a single unverified claim.

### 7. Evidence Engine

The Evidence Engine is the core of Jocasta.

It should connect:

- Events.
- Claims.
- Sources and original publications.
- Organizations and other entities.
- Locations.
- Observed timestamps and retrieval timestamps.
- Supporting and contradictory evidence.
- Derived assessments and their processing versions.

The system should distinguish independent corroboration from articles that repeat the same original report.

Corrections and new information must not silently rewrite what a historical investigation originally contained.

### 8. Explainable Change Detection

Identify potentially meaningful changes relative to historical baselines.

Each important alert should explain:

- What changed.
- Which baseline was used.
- Which evidence supports the alert.
- How current the evidence is.
- What remains uncertain.
- Which alternative explanations may fit the observations.

Change detection should aim to reduce duplicate and low-value alerts without hiding meaningful developments.

### 9. Evidence Replay

Support historical reconstruction of investigations and alerts.

Users should be able to inspect:

- What information was available at a particular point in time.
- Which source records contributed to an assessment.
- Which assumptions and processing versions were used.
- What later evidence changed the interpretation.
- Whether an alert was useful, incorrect, or inconclusive.

Replay should preserve the original assessment and evaluate it against subsequent information without rewriting history.

### 10. Optional Copilot

A future copilot may support natural-language searches, evidence-linked summaries, and investigative questions.

The evidence engine must remain useful without a language model.

The copilot will be optional, with local processing preferred. No paid AI API is required for the core application.

Retrieved content must be treated as untrusted data, not as instructions that can change application behaviour or execute commands.

### 11. Experimental Predictor

**The predictor is deliberately the final research feature.**

It will not be implemented until the evidence pipeline, relevant data integrations, historical replay, and automated tests are working.

The initial experiment may compare a simple historical baseline against candidate statistical models for a clearly defined regional event outcome over fixed forecasting horizons.

The experiment must:

- Define the outcome and prediction horizon in advance.
- Prevent future information from leaking into historical predictions.
- Evaluate on unseen time periods.
- Compare against a simple baseline.
- Report appropriate error and calibration metrics.
- Document uncertainty, limitations, and negative findings.
- Remain optional and separate from the core intelligence workstation.

Forecasts are research estimates, not certainty about future events.

## Evidence Principles

Jocasta should keep four concepts distinct:

1. **Observation:** What a dataset or source directly records.
2. **Claim:** What a source says happened.
3. **Inference:** A conclusion derived from observations or claims.
4. **Forecast:** An estimate about a defined future outcome.

Every important assessment should expose its supporting evidence, time context, assumptions, uncertainty, and known counterevidence where available.

Source popularity, repetition, or apparent authority must not substitute for verification.

## Proposed Technology Direction

The intended architecture is a modular, local-first application.

Proposed components include:

- React, TypeScript, and Vite for the frontend.
- MapLibre GL JS for map rendering.
- Python and FastAPI for the backend API.
- SQLite for operational records and local application state.
- DuckDB and Parquet for analytical queries and historical datasets.

These are proposed technologies, not installed dependencies or implemented components.

Before installation, selected stable versions must be checked against official release information, operating-system support, and the compatibility requirements of the full dependency set.

The project should use the latest suitable stable releases, dependency lockfiles where appropriate, and reproducible installation instructions.

Newer is not automatically better if a required dependency is incompatible or immature.

## Free-First Policy

The goal is **zero mandatory subscriptions and no required cloud hosting**.

The core application should run locally, and stored evidence should remain available when external services are offline.

Potential data-source categories include:

- Global news and event datasets.
- Historical conflict datasets.
- Publicly documented installation and infrastructure records.
- Permitted aviation observations.
- Permitted maritime datasets.
- Official reports and other lawfully accessible public information.

Every connector must document:

- Source identity and original reference.
- Applicable licence and terms of use.
- Attribution requirements.
- Authentication and rate limits.
- Expected refresh frequency.
- Coverage limitations.
- Whether storage or redistribution is permitted.

Free software does not guarantee free, unrestricted, or unlimited access to external data. Jocasta must not bypass authentication, rate limits, or licensing restrictions.

Where a source cannot support the intended integration, the application should use a lawful alternative, historical data, or a clearly documented coverage gap.

No hosted AI provider is required. The evidence engine must remain useful without a language model.

## Security and Reliability

The application will work towards the following controls:

- Bind the local API to `127.0.0.1` by default.
- Keep credentials out of source control, frontend bundles, and ordinary logs.
- Treat external source material as untrusted input.
- Validate records and constrain outbound requests.
- Separate observed data from derived interpretations.
- Record source identity, retrieval times, and processing versions.
- Display stale or failed data feeds clearly.
- Test interrupted ingestion, malformed records, unavailable APIs, and expired credentials.
- Document a threat model and security limitations.
- Maintain reproducible builds and reviewable changes.

These are development goals. Jocasta does not currently claim security certification or military-grade operational reliability.

## Research Questions

The research programme will investigate:

1. Can source-lineage tracking distinguish independent corroboration from repeated reporting?
2. Can historical regional baselines reduce low-value alerts without hiding meaningful changes?
3. Can an evidence-first workflow improve event-verification time compared with a chronological news feed?
4. Can historical assessments be reconstructed faithfully from recorded evidence and processing versions?
5. Do candidate regional forecasts outperform simple historical baselines on unseen periods?

Methods, datasets, evaluation procedures, limitations, and negative findings should be documented.

No model should be considered successful merely because it is more complex.

## Development Roadmap

The implementation is expected to proceed in this order:

1. **Foundation:** project shell, configuration, local startup, and navigation.
2. **Strategic Atlas:** base geography, documented installation records, source attribution, and regional filters.
3. **Evidence Engine:** source registry, adapters, normalization, provenance, deduplication, and search.
4. **Monitoring:** eligible aviation, maritime, and geopolitical data integrations plus explainable change detection.
5. **Replay and Hardening:** historical reconstruction, data-quality checks, automated tests, and security documentation.
6. **Experimental Predictor:** optional forecasting and historical evaluation, only after the previous stages are working.

The predictor remains the final stage.

## Project Principles

- **Evidence before AI.** The system must be useful without a language model.
- **Local first.** Avoid mandatory hosted infrastructure and subscriptions.
- **Latest compatible technology.** Prefer current stable releases with verified compatibility.
- **Transparent uncertainty.** Missing data and weak evidence must remain visible.
- **Reproducible research.** Preserve enough context to rerun analyses and evaluate outcomes.
- **Source-respecting ingestion.** Follow licences, attribution requirements, rate limits, and access terms.
- **Incremental development.** Build and review one file at a time, with focused tests and documentation.

## Current Status

Jocasta is at the initial repository-documentation stage. The local Git repository has been initialized, but no application features have been implemented.

Setup instructions will be added when the corresponding implementation exists and has been tested.

Early development should prioritise source research, data licensing, reproducible benchmark design, security review, and small, testable changes. No source integration should be described as supported until its access method and usage terms have been verified.

## License

The intended licence for Jocasta's original code is MIT, subject to adding and reviewing the project's licence file.

That licence will not override separate terms governing third-party datasets, APIs, maps, images, or other source material.

## Disclaimer

Jocasta is a research and situational-awareness project built from public and otherwise lawfully accessible information.

Its data may be incomplete, delayed, inaccurate, or biased. An observation is not proof of its cause, and a forecast is not a statement of certainty.

Jocasta is not a substitute for authoritative reporting, professional judgement, or emergency guidance.