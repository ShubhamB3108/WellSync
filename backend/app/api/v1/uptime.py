from fastapi import APIRouter, Request, Response
from app.jobs.keep_alive import record_ping, get_uptime_stats, execute_keepalive_ping

router = APIRouter(prefix="/uptime", tags=["uptime"])

@router.api_route("/ping", methods=["GET", "HEAD"])
def ping_endpoint(request: Request, response: Response):
    """
    Dedicated lightweight ping endpoint for UptimeRobot (https://uptimerobot.com/)
    and external keep-alive probes. Supports both GET and HEAD requests.
    """
    source = request.headers.get("user-agent", "unknown")
    result = record_ping(source=source)
    # Set standard caching headers to prevent proxies from caching pings
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["X-WellSync-Status"] = "healthy"
    return result

@router.get("/stats")
def uptime_stats():
    """
    Returns server uptime telemetry, total pings received, and
    UptimeRobot (uptimerobot.com) integration specifications.
    """
    return get_uptime_stats()

@router.post("/test-ping")
def test_outbound_ping():
    """
    Manually triggers an outbound keep-alive ping to the external Render URL
    to verify network routing through Render's ingress proxy.
    """
    res = execute_keepalive_ping()
    return {
        "message": "Outbound keepalive test executed",
        "result": res
    }
