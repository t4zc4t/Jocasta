"""Something that happened, as Jocasta currently understands it.

Events are versioned. Every change makes a new record that points back at
the one it replaces, so we can always see what was believed at any earlier
point and who or what changed it.
"""

from enum import StrEnum
from typing import Self
from uuid import UUID, uuid7

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class Category(StrEnum):
    CONFLICT = "conflict"
    PROTEST = "protest"
    DISASTER = "disaster"
    DIPLOMATIC = "diplomatic"
    INFRASTRUCTURE = "infrastructure"
    OTHER = "other"


class TimePrecision(StrEnum):
    EXACT = "exact"
    DAY = "day"
    MONTH = "month"
    YEAR = "year"


class PlacePrecision(StrEnum):
    CITY = "city"
    REGION = "region"
    COUNTRY = "country"


class Confidence(StrEnum):
    UNVERIFIED = "unverified"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Place(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    name: str = Field(min_length=1)
    country_code: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")
    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)
    precision: PlacePrecision

    # two decimals is roughly a kilometre, enough for research and
    # deliberately too coarse to pin down anything operational
    @field_validator("lat", "lon")
    @classmethod
    def coarsen(cls, value: float | None) -> float | None:
        return None if value is None else round(value, 2)

    @model_validator(mode="after")
    def both_or_neither(self) -> Self:
        if (self.lat is None) != (self.lon is None):
            raise ValueError("lat and lon go together")
        return self


class Event(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    # same across every version of the event
    event_id: UUID = Field(default_factory=uuid7)
    # unique to this version
    record_id: UUID = Field(default_factory=uuid7)
    version: int = Field(default=1, ge=1)
    supersedes: UUID | None = None

    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(default="", max_length=2000)
    category: Category
    place: Place
    started_at: AwareDatetime
    ended_at: AwareDatetime | None = None
    time_precision: TimePrecision = TimePrecision.DAY
    confidence: Confidence = Confidence.UNVERIFIED

    # provenance for this version
    recorded_at: AwareDatetime
    recorded_by: str = Field(min_length=1, max_length=100)
    change_note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def check(self) -> Self:
        if self.ended_at and self.ended_at < self.started_at:
            raise ValueError("ended_at can't be before started_at")
        if self.version == 1 and self.supersedes is not None:
            raise ValueError("the first version doesn't supersede anything")
        if self.version > 1 and (self.supersedes is None or not self.change_note):
            raise ValueError("later versions need supersedes and a change_note")
        return self

    def revise(
        self,
        *,
        recorded_at: AwareDatetime,
        recorded_by: str,
        change_note: str,
        **changes,
    ) -> Event:
        if recorded_at < self.recorded_at:
            raise ValueError("a revision can't be older than what it replaces")
        for locked in ("event_id", "record_id", "version", "supersedes"):
            if locked in changes:
                raise ValueError(f"{locked} is set by revise()")

        data = self.model_dump()
        data.update(changes)
        data.update(
            record_id=uuid7(),
            version=self.version + 1,
            supersedes=self.record_id,
            recorded_at=recorded_at,
            recorded_by=recorded_by,
            change_note=change_note,
        )
        return Event.model_validate(data)
