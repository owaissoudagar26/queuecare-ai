import pytest

def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_admin_login_success(client):
    response = client.post("/api/auth/login", json={
        "email": "admin@queuecare.ai",
        "password": "QueueCare2026!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "admin"
    assert data["token_type"] == "bearer"

def test_doctor_login_success(client):
    response = client.post("/api/auth/login", json={
        "email": "dr.sarah@queuecare.ai",
        "password": "QueueCare2026!"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "doctor"

def test_invalid_login_rejection(client):
    response = client.post("/api/auth/login", json={
        "email": "admin@queuecare.ai",
        "password": "WrongPassword123!"
    })
    assert response.status_code == 401

def test_demo_accounts_list(client):
    response = client.get("/api/auth/demo-accounts")
    assert response.status_code == 200
    assert "accounts" in response.json()
    assert len(response.json()["accounts"]) >= 4
