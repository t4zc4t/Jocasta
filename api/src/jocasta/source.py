"""Where evidence comes from.

A source is registered once, with its licence and access terms, before
anything from it gets stored. Sources are immutable: a change in terms is
a new record, not an edit, so old evidence keeps the terms it came under.
"""

from datetime import datetime
from enum import StrEnum

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, HttpUrl


class SourceKind(StrEnum):
    OFFICIAL = "official"  # governments, UN bodies, courts
    DATASET = "dataset"  # curated research data like UCDP
    AGGREGATOR = "aggregator"  # GDELT and similar event feeds
    NEWS = "news"  # a single outlet
    RESEARCH = "research"  # papers, think tank reports


class Access(StrEnum):
    OPEN = "open"
    API_KEY = "api_key"
    RESTRICTED = "restricted"


class Source(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    id: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=64)
    name: str = Field(min_length=1)
    kind: SourceKind
    url: HttpUrl
    licence: str = Field(min_length=1)
    licence_url: HttpUrl | None = None
    attribution: str = Field(min_length=1)
    access: Access
    # None means we haven't confirmed it yet, so treat it as "no"
    allows_redistribution: bool | None = None
    rate_limit: str | None = None
    added_at: AwareDatetime
    notes: str | None = None

    @property
    def can_redistribute(self) -> bool:
        return self.allows_redistribution is True

    def added_before(self, moment: datetime) -> bool:
        return self.added_at < moment
