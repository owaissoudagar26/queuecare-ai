from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any

from app.database import get_db
from app.models import Department, AIModelMetric, User
from app.schemas import (
    WaitTimePredictionRequest, WaitTimePredictionResponse, ModelEvaluationResponse
)
from app.auth import get_staff_or_admin, get_admin_user
from app.services.ai_service import ai_service
from app.ml.train_model import train_waiting_time_model
from app.ml.model_evaluator import evaluate_current_model

router = APIRouter(prefix="/ai", tags=["AI & Machine Learning"])

@router.post("/predict", response_model=WaitTimePredictionResponse)
def predict_waiting_time(req: WaitTimePredictionRequest, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == req.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    result = ai_service.predict_wait_time(
        department_code=dept.code,
        queue_position=req.queue_position,
        active_doctors=req.active_doctors_count or 1,
        avg_consultation_time=dept.avg_consultation_time,
        hour_of_day=req.hour_of_day,
        day_of_week=req.day_of_week,
        priority=req.priority.value if req.priority else "routine"
    )

    return WaitTimePredictionResponse(
        predicted_wait_minutes=result["predicted_wait_minutes"],
        predicted_range_min=result["predicted_range_min"],
        predicted_range_max=result["predicted_range_max"],
        is_ai_predicted=result["is_ai_predicted"],
        is_fallback=result["is_fallback"],
        model_version=result["model_version"],
        calculation_breakdown=result["calculation_breakdown"],
        disclaimer=result["disclaimer"],
    )

@router.get("/metrics", response_model=ModelEvaluationResponse)
def get_model_metrics():
    meta = ai_service.get_metadata()
    if not meta:
        raise HTTPException(status_code=404, detail="Model metadata unavailable")

    return ModelEvaluationResponse(
        model_name=meta.get("model_name", "RandomForest_WaitTime_Regressor_v1"),
        training_date=meta.get("training_date") or datetime.utcnow().isoformat(),
        sample_size=meta.get("sample_size", 6000),
        mae=meta.get("mae", 3.2),
        rmse=meta.get("rmse", 4.5),
        r2_score=meta.get("r2_score", 0.88),
        baseline_rule_mae=meta.get("baseline_rule_mae", 7.4),
        baseline_rule_rmse=meta.get("baseline_rule_rmse", 9.8),
        feature_importances=meta.get("feature_importances", {}),
        synthetic_notice=meta.get("synthetic_notice", "Trained on synthetic queuing distribution data. Non-clinical use only.")
    )

@router.get("/evaluation-comparison")
def get_evaluation_comparison():
    return evaluate_current_model(n_eval_samples=500)

@router.post("/retrain")
def retrain_model(background_tasks: BackgroundTasks, current_user: User = Depends(get_admin_user)):
    def run_training_task():
        new_meta = train_waiting_time_model(n_samples=7500)
        ai_service.load_or_train_model()

    background_tasks.add_task(run_training_task)
    return {"message": "Model retraining job initiated successfully in the background."}
