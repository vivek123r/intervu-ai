from datetime import UTC, datetime
from typing import Annotated

from pydantic import AwareDatetime, PlainSerializer


def utcnow() -> datetime:
    return truncate_to_millis(datetime.now(UTC))


def truncate_to_millis(dt: datetime) -> datetime:
    return dt.replace(microsecond=(dt.microsecond // 1000) * 1000)


def ensure_utc(dt: datetime) -> datetime:
    # Mongo drivers (and mongomock) can hand back naive datetimes even for values
    # written as UTC-aware — every datetime this app writes is already UTC, so a
    # naive one read back is safe to re-tag rather than reject.
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def to_iso_millis(dt: datetime) -> str:
    dt = dt.astimezone(UTC)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


# UTC, millisecond-precision, "...Z"-suffixed on the wire (API-CONTRACT.md's timestamp format).
# AwareDatetime rejects naive/offset-less input instead of silently misreading it as UTC.
UtcDatetime = Annotated[AwareDatetime, PlainSerializer(to_iso_millis, return_type=str)]
