"""Bounded decoder for the reviewed contract subset, matching the Node decoder.

Schemas and wire values are heterogeneous JSON. Any is confined to this internal
codec; public inputs and outputs are generated static types.
"""
from __future__ import annotations

import json
import keyword
import math
import re
from datetime import datetime, timezone
from importlib.resources import files
from typing import Any

from ._errors import InsideDMConfigurationError
from ._models import NOT_GIVEN

CONTRACT = json.loads(files("insidedm._generated").joinpath("contract.json").read_text())
SCHEMAS = CONTRACT["schemas"]
OPERATIONS = CONTRACT["operations"]


def snake(name: str) -> str:
    value = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", name)).lower()
    return value + "_" if keyword.iskeyword(value) else value


def resolve(schema: dict[str, Any]) -> dict[str, Any]:
    return SCHEMAS[schema["$ref"].rsplit("/", 1)[1]] if "$ref" in schema else schema


class SchemaMismatch(ValueError):
    def __init__(self, field: str, hint: str = "Use the documented value shape."):
        self.field, self.hint = field, hint
        super().__init__("Invalid contract value.")


def _score(schema: dict[str, Any], value: Any) -> int:
    schema = resolve(schema)
    if not isinstance(value, dict):
        return 0
    score = sum(2 if k in value else -2 for k in schema.get("required", []))
    for key, child in schema.get("properties", {}).items():
        if key in value:
            score += (100 if value[key] == child["const"] else -100) if "const" in child else 1
    return score


def decode(schema: dict[str, Any], value: Any, *, field: str = "input",
           response: bool = False, python_names: bool = False, depth: int = 0) -> Any:
    result = _decode(schema, value, field=field, response=response, python_names=python_names, depth=depth)
    if "$ref" in schema:
        from ._semantics import DomainMismatch, validate
        try:
            validate(schema["$ref"].rsplit("/", 1)[1], result)
        except DomainMismatch as error:
            raise SchemaMismatch(field + "." + snake(error.field), error.hint) from None
        except (ValueError, KeyError, TypeError, OverflowError):
            raise SchemaMismatch(field, "Use a consistent documented resource state.") from None
    return result


def _decode(schema: dict[str, Any], value: Any, *, field: str,
            response: bool, python_names: bool, depth: int) -> Any:
    def refuse(hint: str = "Use the documented value shape."):
        raise SchemaMismatch(field, hint)

    if depth > 40:
        refuse()
    schema = resolve(schema)
    # Sibling object constraints apply to composed schemas too (e.g. a nonempty
    # custom-field patch). Enforce them before resolving allOf branches.
    if isinstance(value, dict) and not schema.get("minProperties", 0) <= len(value) <= schema.get("maxProperties", math.inf):
        refuse("Use the documented number of entries.")
    if "allOf" in schema:
        merged = {}
        for part in schema["allOf"]:
            result = decode(part, value, field=field, response=response, python_names=python_names, depth=depth + 1)
            if not isinstance(result, dict):
                refuse()
            merged.update(result)
        return merged
    if "oneOf" in schema:
        matches, failures = [], []
        for part in schema["oneOf"]:
            try:
                matches.append(decode(part, value, field=field, response=response, python_names=python_names, depth=depth + 1))
            except SchemaMismatch as error:
                failures.append((_score(part, value), error))
        if len(matches) == 1:
            return matches[0]
        failures.sort(key=lambda p: p[0], reverse=True)
        if not matches and failures and (len(failures) == 1 or failures[0][0] > failures[1][0]):
            raise failures[0][1]
        refuse("Choose exactly one supported shape.")
    if isinstance(value, datetime) and schema.get("format") == "date-time" and not response:
        if value.tzinfo is None or value.utcoffset() is None:
            refuse("Use a timestamp with an explicit time zone.")
        value = value.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    kinds = schema.get("type", [])
    kinds = [kinds] if isinstance(kinds, str) else kinds
    actual = ("null" if value is None else "boolean" if type(value) is bool else
              "string" if isinstance(value, str) else "object" if isinstance(value, dict) else
              "array" if isinstance(value, list) else "integer" if type(value) is int else
              "number" if type(value) is float and math.isfinite(value) else "invalid")
    if kinds and actual not in kinds and not (actual == "integer" and "number" in kinds):
        refuse("Use the documented value type.")
    if actual == "integer" and abs(value) > 9007199254740991:
        refuse("Use a safe whole number.")
    if "const" in schema and (type(value) is not type(schema["const"]) or value != schema["const"]):
        refuse("Use the fixed value in the input type.")
    if "enum" in schema and value not in schema["enum"]:
        if response and isinstance(value, str) and "unknown" in schema["enum"]:
            return "unknown"
        refuse("Choose a documented value.")
    if isinstance(value, str):
        length = len(value.encode("utf-16-le", errors="surrogatepass")) // 2
        if length < schema.get("minLength", 0) or length > schema.get("maxLength", math.inf):
            refuse("Use a string within the documented length bounds.")
        if schema.get("pattern") and re.search(schema["pattern"], value, flags=re.ASCII) is None:
            refuse("Use the documented format.")
        if schema.get("format") == "uuid" and re.fullmatch(r"[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}", value) is None:
            refuse("Use an InsideDM resource ID in UUID format.")
        if schema.get("format") == "date-time":
            try:
                parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
                if parsed.utcoffset() is None or not re.match(r"\d{4}-\d{2}-\d{2}T", value):
                    refuse("Use a valid timestamp with a time zone.")
            except ValueError:
                refuse("Use a valid timestamp with a time zone.")
        if schema.get("format") == "date" and re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) is None:
            refuse("Use YYYY-MM-DD.")
    if actual in ("number", "integer"):
        if not schema.get("minimum", -math.inf) <= value <= schema.get("maximum", math.inf):
            refuse("Use a number within the documented bounds.")
    if isinstance(value, list):
        if not schema.get("minItems", 0) <= len(value) <= schema.get("maxItems", math.inf):
            refuse("Use the documented number of items.")
        if schema.get("uniqueItems") and len({json.dumps(v, sort_keys=True, separators=(",", ":")) for v in value}) != len(value):
            refuse("Use distinct items.")
        return [decode(schema.get("items", {}), v, field=field, response=response, python_names=python_names, depth=depth + 1) for v in value]
    if isinstance(value, dict):
        if not schema.get("minProperties", 0) <= len(value) <= schema.get("maxProperties", math.inf):
            refuse("Use the documented number of entries.")
        if "properties" not in schema and not isinstance(schema.get("additionalProperties"), dict):
            return value.copy()
        properties = schema.get("properties", {})
        names = {snake(k) if python_names else k: k for k in properties}
        for k in schema.get("required", []):
            if value.get(snake(k) if python_names else k, NOT_GIVEN) is NOT_GIVEN:
                raise SchemaMismatch(field + "." + snake(k), "Provide this required field.")
        result = {}
        for k, v in value.items():
            if not isinstance(k, str):
                refuse("Use string keys.")
            if v is NOT_GIVEN:
                continue
            if k in names:
                wire = names[k]
                result[wire] = decode(properties[wire], v, field=field + "." + snake(wire), response=response, python_names=python_names, depth=depth + 1)
            else:
                if "propertyNames" in schema:
                    decode(schema["propertyNames"], k, field=field, depth=depth + 1)
                extra = schema.get("additionalProperties")
                if isinstance(extra, dict):
                    result[k] = decode(extra, v, field=field, response=response, python_names=python_names, depth=depth + 1)
                elif extra is False and not response:
                    refuse("Remove fields not listed in the input type.")
        return result
    return value


def input_value(schema: dict[str, Any], value: Any, field: str = "input") -> Any:
    try:
        return decode(schema, value, field=field, python_names=True)
    except SchemaMismatch as error:
        raise InsideDMConfigurationError(error.hint, field=error.field) from None


def identities(schema, value):
    """Yield identities only at declared contract properties, never map keys."""
    schema = resolve(schema)
    if "allOf" in schema:
        for part in schema["allOf"]:
            yield from identities(part, value)
    elif "oneOf" in schema:
        for part in schema["oneOf"]:
            try:
                decode(part, value, response=True)
            except SchemaMismatch:
                continue
            yield from identities(part, value)
            break
    elif isinstance(value, list):
        for child in value:
            yield from identities(schema.get("items", {}), child)
    elif isinstance(value, dict):
        properties = schema.get("properties", {})
        for key, child in value.items():
            if key in properties:
                if key in {"businessId", "applicationId"} and isinstance(child, str):
                    yield key, child
                yield from identities(properties[key], child)
            elif isinstance(schema.get("additionalProperties"), dict):
                yield from identities(schema["additionalProperties"], child)
