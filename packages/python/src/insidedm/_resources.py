from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from typing import Any

from ._errors import InsideDMConfigurationError, InsideDMProtocolError
from ._models import PageResult


def _bounds(kwargs):
    captured = dict(kwargs)
    bounds = [captured.pop("max_pages", None), captured.pop("max_items", None)]
    for value in bounds:
        if value is not None and (type(value) is not int or not 1 <= value <= 9007199254740991):
            raise InsideDMConfigurationError("Pagination bounds must be positive safe integers.")
    return captured, bounds[0], bounds[1]


class SyncResource:
    def __init__(self, transport):
        self._transport = transport

    def _invoke(self, key, paths, kwargs):
        return self._transport.invoke(key, paths, kwargs)

    def _iter_pages(self, key, paths, kwargs) -> Iterator[PageResult[Any]]:
        captured, max_pages, max_items = _bounds(kwargs)

        def pages():
            count = page_count = 0
            cursor = captured.get("cursor")
            seen = {cursor} if cursor else set()
            while (max_pages is None or page_count < max_pages) and (max_items is None or count < max_items):
                page = self._invoke(key, paths, {**captured, **({"cursor": cursor} if cursor else {})})
                items = page.data[:max_items - count] if max_items is not None else page.data
                yield PageResult(items, page.meta, page.page)
                count += len(items)
                page_count += 1
                cursor = page.page.next_cursor
                if cursor is None:
                    break
                if cursor in seen:
                    raise InsideDMProtocolError("InsideDM returned a repeated pagination cursor.", code="repeated_cursor", meta=page.meta)
                seen.add(cursor)
        return pages()

    def _iter_items(self, key, paths, kwargs):
        pages = self._iter_pages(key, paths, kwargs)
        return (item for page in pages for item in page.data)


class AsyncResource:
    def __init__(self, transport):
        self._transport = transport

    async def _invoke(self, key, paths, kwargs):
        return await self._transport.invoke(key, paths, kwargs)

    def _iter_pages(self, key, paths, kwargs) -> AsyncIterator[PageResult[Any]]:
        captured, max_pages, max_items = _bounds(kwargs)

        async def pages():
            count = page_count = 0
            cursor = captured.get("cursor")
            seen = {cursor} if cursor else set()
            while (max_pages is None or page_count < max_pages) and (max_items is None or count < max_items):
                page = await self._invoke(key, paths, {**captured, **({"cursor": cursor} if cursor else {})})
                items = page.data[:max_items - count] if max_items is not None else page.data
                yield PageResult(items, page.meta, page.page)
                count += len(items)
                page_count += 1
                cursor = page.page.next_cursor
                if cursor is None:
                    break
                if cursor in seen:
                    raise InsideDMProtocolError("InsideDM returned a repeated pagination cursor.", code="repeated_cursor", meta=page.meta)
                seen.add(cursor)
        return pages()

    def _iter_items(self, key, paths, kwargs):
        pages = self._iter_pages(key, paths, kwargs)

        async def items():
            async for page in pages:
                for item in page.data:
                    yield item
        return items()
