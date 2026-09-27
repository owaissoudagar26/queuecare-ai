import pytest

def test_ai_prediction_endpoint(client):
    payload = {
        "department_id": 1,
        "queue_position": 4,
        "active_doctors_count": 2,
        "priority": "routine",
        "hour_of_day": 10,
        "day_of_week": 1
    }
    response = client.post("/api/ai/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert "predicted_wait_minutes" in data
    assert data["predicted_wait_minutes"] > 0
    assert "predicted_range_min" in data
    assert "predicted_range_max" in data
    assert "calculation_breakdown" in data
    assert "disclaimer" in data

def test_ai_metrics_endpoint(client):
    response = client.get("/api/ai/metrics")
    assert response.status_code == 200
    data = response.json()
    
    assert "mae" in data
    assert "rmse" in data
    assert "r2_score" in data
    assert "feature_importances" in data
    assert data["mae"] > 0

def test_ai_evaluation_comparison(client):
    response = client.get("/api/ai/evaluation-comparison")
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "ok"
    assert "live_eval_mae" in data
    assert "rule_based_mae" in data
    assert "sample_comparisons" in data
    assert len(data["sample_comparisons"]) > 0
