from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_uptime_ping_get():
    resp = client.get("/api/v1/uptime/ping")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "pong"
    assert "timestamp" in data
    assert data["total_pings"] >= 1

def test_uptime_ping_head():
    resp = client.head("/api/v1/uptime/ping")
    assert resp.status_code == 200
    assert resp.headers.get("X-WellSync-Status") == "healthy"

def test_health_check_supports_head():
    resp_get = client.get("/health")
    assert resp_get.status_code == 200
    data = resp_get.json()
    assert data["status"] == "healthy"
    assert "monitoring" in data
    assert "uptimerobot.com" in data["monitoring"]["service"]

    resp_head = client.head("/health")
    assert resp_head.status_code == 200
    assert resp_head.headers.get("X-WellSync-Status") == "healthy"

def test_uptime_stats():
    resp = client.get("/api/v1/uptime/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "online"
    assert "uptime_seconds" in data
    assert "uptimerobot_setup" in data
    setup = data["uptimerobot_setup"]
    assert setup["service_name"] == "UptimeRobot"
    assert setup["service_website"] == "https://uptimerobot.com/"
    assert "https://wellsync-backend-1emc.onrender.com/health" in setup["recommended_url"]
