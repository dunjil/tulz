"""GeoIP service for country detection from IP addresses."""

import asyncio
from typing import Optional, Tuple
import httpx
from functools import lru_cache


class GeoIPService:
    """Service to get country information from IP addresses."""

    # Cache for IP lookups (simple in-memory cache)
    _cache: dict[str, Tuple[Optional[str], Optional[str]]] = {}

    @classmethod
    async def get_country(cls, ip_address: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Get country code and name from IP address.

        Returns:
            Tuple of (country_code, country_name) or (None, None) if lookup fails
        """
        # Skip local/private IPs
        if ip_address in ("127.0.0.1", "localhost", "unknown", "::1"):
            return None, None

        if ip_address.startswith(("10.", "172.16.", "172.17.", "172.18.", "172.19.",
                                   "172.20.", "172.21.", "172.22.", "172.23.",
                                   "172.24.", "172.25.", "172.26.", "172.27.",
                                   "172.28.", "172.29.", "172.30.", "172.31.",
                                   "192.168.")):
            return None, None

        # Check cache
        if ip_address in cls._cache:
            return cls._cache[ip_address]

        try:
            # Use ip-api.com (free, 45 requests/minute)
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"http://ip-api.com/json/{ip_address}",
                    params={"fields": "status,country,countryCode"}
                )

                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "success":
                        country_code = data.get("countryCode")
                        country_name = data.get("country")
                        # Cache the result
                        cls._cache[ip_address] = (country_code, country_name)
                        # Limit cache size
                        if len(cls._cache) > 10000:
                            # Remove oldest entries (simple approach)
                            keys = list(cls._cache.keys())[:5000]
                            for key in keys:
                                del cls._cache[key]
                        return country_code, country_name

        except Exception:
            # Don't fail the request if GeoIP lookup fails
            pass

        return None, None

    @classmethod
    def get_country_sync(cls, ip_address: str) -> Tuple[Optional[str], Optional[str]]:
        """Synchronous wrapper for get_country."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # We're in an async context, return None and let caller handle
                return None, None
            return loop.run_until_complete(cls.get_country(ip_address))
        except RuntimeError:
            return None, None
