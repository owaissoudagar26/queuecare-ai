import pytest

def test_departments_list(client):
    response = client.get("/api/departments")
    assert response.status_code == 200
    departments = response.json()
    assert len(departments) >= 5
    codes = [d["code"] for d in departments]
    assert "CARD" in codes
    assert "PED" in codes

def test_patient_registration_and_lookup(client):
    # Register a new patient
    reg_payload = {
        "full_name": "Test Patient Alexander",
        "age": 45,
        "gender": "Male",
        "phone": "+1 555-7788",
        "email": "alexander.test@example.com",
        "department_id": 1,
        "priority": "routine",
        "notes": "Automated unit test checkin"
    }
    res = client.post("/api/queue/register", json=reg_payload)
    assert res.status_code == 200
    ticket_data = res.json()
    
    assert "ticket_number" in ticket_data
    assert "lookup_hash" in ticket_data
    assert ticket_data["status"] == "waiting"
    assert ticket_data["predicted_wait_minutes"] > 0

    ticket_number = ticket_data["ticket_number"]
    lookup_pin = ticket_data["lookup_hash"]

    # Test patient lookup via ticket and PIN
    lookup_res = client.post("/api/queue/lookup", json={
        "ticket_number": ticket_number,
        "lookup_code": lookup_pin
    })
    assert lookup_res.status_code == 200
    status_data = lookup_res.json()
    assert status_data["ticket_number"] == ticket_number
    assert status_data["status"] == "waiting"
    assert "patients_ahead" in status_data

def test_public_kiosk_data(client):
    response = client.get("/api/queue/public-kiosk")
    assert response.status_code == 200
    data = response.json()
    assert "kiosk_board" in data
    assert len(data["kiosk_board"]) >= 5
