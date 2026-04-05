import logging
import asyncio
import httpx
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

SEARCH_API_URL = "http://localhost:8000/search"
SEARCH_TIMEOUT = 20.0  # 20 seconds timeout per request


async def fetch_single_query(client: httpx.AsyncClient, query: str) -> str:
    try:
        response = await client.post(
            SEARCH_API_URL, json={"query": query, "top_k": 3}, timeout=SEARCH_TIMEOUT
        )
        response.raise_for_status()
        data = response.json()

        results_text = []
        for res in data.get("results", []):
            title = res.get("title", "")
            content = res.get("content", "")
            results_text.append(f"《{title}》: {content}")

        if results_text:
            return f"【{query}】召回资料:\n" + "\n".join(results_text)
        return ""
    except httpx.TimeoutException:
        logger.warning(f"Search timeout for query: {query}")
        return ""
    except Exception as e:
        logger.warning(f"Search error for query: {query}, error: {e}")
        return ""


async def fetch_search_results(queries: List[str]) -> str:
    """
    Concurrent search for multiple queries.
    Returns a concatenated context string.
    """
    if not queries:
        return ""

    logger.info(f"Starting concurrent search for {len(queries)} queries...")

    async with httpx.AsyncClient() as client:
        tasks = [fetch_single_query(client, q) for q in queries]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    valid_results = []
    for r in results:
        if isinstance(r, str) and r.strip():
            valid_results.append(r.strip())

    if not valid_results:
        return ""

    context = "\n\n".join(valid_results)
    return context
