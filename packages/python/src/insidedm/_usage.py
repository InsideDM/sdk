"""Shared application-telemetry window and response policy from the Node owner."""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

_EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)


def normalize_usage_instant(value):
    if isinstance(value, datetime):
        if value.utcoffset() is None:
            raise ValueError("A time zone is required.")
        value = value.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    if (not isinstance(value, str) or len(value) > 40 or
        re.fullmatch(r"\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?", value, re.ASCII) is None):
        raise ValueError("Use an ISO date or a timestamp with a time zone.")
    instant = datetime.fromisoformat((value + "T00:00:00Z" if len(value) == 10 else value).replace("Z", "+00:00"))
    return instant.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _milliseconds(value):
    return (datetime.fromisoformat(value.replace("Z", "+00:00")) - _EPOCH) // timedelta(milliseconds=1)


def capture_partner_usage_query(query):
    unit = 60000 if query.get("granularity", "day") == "minute" else 86400000
    captured = {key: normalize_usage_instant(value) if key in {"from", "to"} else value for key, value in query.items()}
    endpoints = {key: _milliseconds(captured[key]) for key in ["from", "to"] if key in captured}
    if any(value % unit != 0 for value in endpoints.values()):
        raise ValueError("Use complete UTC buckets.")
    if len(endpoints) == 2 and not 0 < endpoints["to"] - endpoints["from"] <= (86400000 if unit == 60000 else 31 * unit):
        raise ValueError("Use at most 31 days or 24 hours of minute buckets.")
    return captured


def capture_partner_usage(value):
    query = capture_partner_usage_query({key: value[key] for key in ["from", "to", "granularity"]})
    if any(query[key] != value[key] for key in ["from", "to"]):
        raise ValueError("Use canonical UTC interval endpoints.")
    start, end = [_milliseconds(query[key]) for key in ["from", "to"]]
    unit = 86400000 if query["granularity"] == "day" else 60000
    freshness = dict(value["freshness"])
    for key in ["observedAt", "retainedSince"]:
        freshness[key] = normalize_usage_instant(freshness[key])
    if (end > _milliseconds(freshness["observedAt"]) // unit * unit or start < _milliseconds(freshness["retainedSince"])
            or len(value["points"]) != (end - start) // unit):
        raise ValueError("Inconsistent telemetry coverage.")
    points = []
    for index, point in enumerate(value["points"]):
        at = normalize_usage_instant(point["bucketStart"])
        if _milliseconds(at) != start + index * unit:
            raise ValueError("Non-contiguous telemetry buckets.")
        points.append({**point, "bucketStart": at})
    if any(sum(point[key] for point in points) != value["total" + key.capitalize()] for key in ["admitted", "refused"]):
        raise ValueError("Inconsistent telemetry totals.")
    if freshness["latestRecordedMinute"] is not None:
        latest = normalize_usage_instant(freshness["latestRecordedMinute"])
        at = _milliseconds(latest)
        if not start <= at < end or at % 60000 != 0:
            raise ValueError("Invalid telemetry freshness.")
        freshness["latestRecordedMinute"] = latest
    return {**value, "points": points, "freshness": freshness}
