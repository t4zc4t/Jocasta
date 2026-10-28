"""What a source said, and how it connects to an event.

A claim is one statement from one source, captured at a point in time.
An evidence link ties a claim to an event and says whether it supports
or contradicts it. Both are immutable; corrections come in as new records.
"""

from enum import StrEnum
from typing import Self
from uuid import UUID, uuid7

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    model_validator,
)

SOURCE_ID = r"^[a-z0-9]+(-[a-z0-9]+)*$"


class Claim(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    id: UUID = Field(default_factory=uuid7)
    source_id: str = Field(pattern=SOURCE_ID, max_length=64)
    # our short summary of what was said, not a copy of the article
    text: str = Field(min_length=1, max_length=1000)
    # an exact excerpt, kept short on purpose
    quote: str | None = Field(default=None, max_length=300)
    url: HttpUrl | None = None
    language: str = Field(default="en", pattern=r"^[a-z]{2,3}(-[A-Za-z0-9]+)*$")
    published_at: AwareDatetime | None = None
    retrieved_at: AwareDatetime
    # sha256 of what we fetched, so we can tell if the page changed later
    content_hash: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")

    @model_validator(mode="after")
    def published_before_retrieved(self) -> Self:
        if self.published_at and self.published_at > self.retrieved_at:
            raise ValueError("published_at can't be after retrieved_at")
        return self


class Relation(StrEnum):
    SUPPORTS = "supports"
    CONTRADICTS = "contradicts"
    MENTIONS = "mentions"


class EvidenceLink(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    id: UUID = Field(default_factory=uuid7)
    claim_id: UUID
    event_id: UUID
    relation: Relation
    # None until someone checks whether it's original reporting
    independent: bool | None = None
    # the claim this one was copied or rewritten from, if known
    derived_from: UUID | None = None
    note: str | None = Field(default=None, max_length=1000)
    created_at: AwareDatetime

    @model_validator(mode="after")
    def check_derivation(self) -> Self:
        if self.derived_from == self.claim_id:
            raise ValueError("a claim can't be derived from itself")
        if self.derived_from and self.independent:
            raise ValueError("a derived claim can't count as independent")
        return self

    @property
    def counts_as_corroboration(self) -> bool:
        # only confirmed independent support counts
        return self.relation is Relation.SUPPORTS and self.independent is True
