import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("wellsync.keep_alive")

_START_TIME = datetime.now(timezone.utc)
_PING_COUNT = 0
_LAST_PING_TIME: Optional[datetime] = None
_LAST_PING_SOURCE: Optional[str] = None
_LAST_OUTBOUND_PING: Optional[Dict[str, Any]] = None

def record_ping(source: str = "unknown") -> Dict[str, Any]:
    """Records an incoming ping from Domain Monitor (domain-monitor.io), browser, or scheduler."""
    global _PING_COUNT, _LAST_PING_TIME, _LAST_PING_SOURCE
    _PING_COUNT += 1
    _LAST_PING_TIME = datetime.now(timezone.utc)
    _LAST_PING_SOURCE = source
    return {
        "status": "pong",
        "timestamp": _LAST_PING_TIME.isoformat(),
        "total_pings": _PING_COUNT,
        "source": source
    }

def get_uptime_stats() -> Dict[str, Any]:
    """Returns comprehensive uptime, ping telemetry, and domain-monitor.io integration data."""
    now = datetime.now(timezone.utc)
    uptime_sec = int((now - _START_TIME).total_seconds())
    days = uptime_sec // 86400
    hours = (uptime_sec % 86400) // 3600
    minutes = (uptime_sec % 3600) // 60
    seconds = uptime_sec % 60
    uptime_human = f"{days}d {hours}h {minutes}m {seconds}s" if days > 0 else f"{hours}h {minutes}m {seconds}s"

    target_health_url = f"{settings.RENDER_EXTERNAL_URL}/health"
    target_ping_url = f"{settings.RENDER_EXTERNAL_URL}{settings.API_V1_STR}/uptime/ping"

    return {
        "status": "online",
        "uptime_seconds": uptime_sec,
        "uptime_human": uptime_human,
        "started_at": _START_TIME.isoformat(),
        "total_pings_received": _PING_COUNT,
        "last_ping_time": _LAST_PING_TIME.isoformat() if _LAST_PING_TIME else None,
        "last_ping_source": _LAST_PING_SOURCE or "none",
        "last_outbound_keepalive": _LAST_OUTBOUND_PING,
        "render_config": {
            "external_url": settings.RENDER_EXTERNAL_URL,
            "keep_alive_enabled": settings.KEEP_ALIVE_ENABLED,
            "interval_minutes": settings.KEEP_ALIVE_INTERVAL_MINUTES,
            "idle_sleep_threshold_minutes": 15
        },
        "domain_monitor_setup": {
            "service_name": "Domain Monitor",
            "service_website": "https://domain-monitor.io/",
            "signup_url": "https://domain-monitor.io/account/create/",
            "features": ["Uptime Monitoring", "SSL Certificate Monitoring", "Ping Test", "Status Pages"],
            "monitor_type": "HTTP(s) / Uptime Monitoring",
            "friendly_name": "WellSync Render Backend (Anti-Sleep)",
            "recommended_url": target_health_url,
            "alternative_url": target_ping_url,
            "recommended_interval_minutes": 5,
            "http_methods": ["GET", "HEAD"],
            "expected_status_code": 200,
            "instructions": (
                "Render free tier web services spin down after 15 minutes of inactivity. "
                "Adding an Uptime Monitor on https://domain-monitor.io/ targeting "
                f"{target_health_url} with a 5-minute or 10-minute check interval "
                "sends periodic external HTTP requests that reset Render's 15-minute idle timer, "
                "ensuring the backend stays permanently awake 24/7."
            )
        }
    }

def execute_keepalive_ping() -> Optional[Dict[str, Any]]:
    """
    Executes an outbound HTTP GET to the external Render URL.
    This routes through Render's public ingress router, resetting the 15-minute idle timer.
    """
    global _LAST_OUTBOUND_PING
    if not settings.KEEP_ALIVE_ENABLED:
        return None

    target_url = f"{settings.RENDER_EXTERNAL_URL}/health"
    headers = {
        "User-Agent": "WellSync-KeepAlive/1.0 (Render-Anti-Sleep-Worker; Domain-Monitor-Integrated)",
        "X-Keep-Alive-Source": "internal_scheduler"
    }

    start_ts = time.time()
    result: Dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "target_url": target_url,
        "success": False
    }

    try:
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            resp = client.get(target_url, headers=headers)
            elapsed_ms = round((time.time() - start_ts) * 1000, 1)
            result["status_code"] = resp.status_code
            result["latency_ms"] = elapsed_ms
            result["success"] = resp.is_success
            logger.info(
                f"[KeepAlive] Outbound keepalive ping to {target_url} returned "
                f"{resp.status_code} ({elapsed_ms}ms) - Render idle timer reset."
            )
    except Exception as e:
        elapsed_ms = round((time.time() - start_ts) * 1000, 1)
        result["error"] = str(e)
        result["latency_ms"] = elapsed_ms
        logger.warning(f"[KeepAlive] Outbound keepalive ping to {target_url} failed: {e}")

    _LAST_OUTBOUND_PING = result
    return result
