import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["db"] == "ok"

def test_auth_login_and_access():
    # Login as field engineer
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "field@wellsync.demo",
        "password": "wellsync123"
    })
    assert login_resp.status_code == 200
    tokens = login_resp.json()
    assert "access_token" in tokens
    assert tokens["role"] == "field_engineer"
    
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    
    # Access wells list
    wells_resp = client.get("/api/v1/wells", headers=headers)
    assert wells_resp.status_code == 200
    wells_data = wells_resp.json()
    assert len(wells_data["items"]) >= 6
    
    # Access well state for BGW-003
    bgw3 = next(w for w in wells_data["items"] if w["name"] == "BGW-003")
    state_resp = client.get(f"/api/v1/wells/{bgw3['id']}/state", headers=headers)
    assert state_resp.status_code == 200
    state = state_resp.json()
    assert state["well_name"] == "BGW-003"
    assert "reservoir" in state
    assert "srp" in state
    assert "rod_failure_risk" in state
    
def test_reports_field_summary():
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "ops@wellsync.demo",
        "password": "wellsync123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    report_resp = client.get("/api/v1/reports/field-summary?format=json&period_days=90", headers=headers)
    assert report_resp.status_code == 200
    rep_data = report_resp.json()
    assert "sor_trend" in rep_data
    assert "energy_per_bbl_trend" in rep_data
    assert len(rep_data["wells_leaderboard"]) >= 6
