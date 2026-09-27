import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from app.config import settings
from app.ml.synthetic_data import generate_synthetic_hospital_data

def evaluate_current_model(n_eval_samples: int = 1000) -> Dict[str, Any]:
    """
    Evaluates the currently saved AI model against fresh synthetic validation data,
    comparing it directly with traditional rule-based estimations.
    """
    if not os.path.exists(settings.MODEL_PATH):
        return {
            "status": "error",
            "message": "Model not trained yet",
            "is_trained": False
        }

    saved = joblib.load(settings.MODEL_PATH)
    pipeline = saved.get("pipeline")
    metadata = saved.get("metadata", {})

    test_df = generate_synthetic_hospital_data(n_samples=n_eval_samples, random_seed=999)
    X = test_df.drop(columns=["actual_wait_minutes"])
    y_actual = test_df["actual_wait_minutes"]

    y_ai_pred = np.maximum(1.0, pipeline.predict(X))
    y_rule_pred = np.maximum(
        2.0,
        ((X["queue_position"] - 1) * (X["avg_consultation_time"] / np.maximum(1, X["active_doctors"])))
    )

    ai_mae = float(np.mean(np.abs(y_actual - y_ai_pred)))
    rule_mae = float(np.mean(np.abs(y_actual - y_rule_pred)))

    # Generate sample comparison points for frontend visualization
    samples = []
    for i in range(min(15, len(test_df))):
        row = test_df.iloc[i]
        samples.append({
            "department": row["department_code"],
            "queue_position": int(row["queue_position"]),
            "active_doctors": int(row["active_doctors"]),
            "priority": row["priority"],
            "actual_wait": float(row["actual_wait_minutes"]),
            "ai_predicted_wait": float(round(y_ai_pred[i], 1)),
            "rule_based_wait": float(round(y_rule_pred[i], 1)),
            "ai_error": float(round(abs(y_actual.iloc[i] - y_ai_pred[i]), 1)),
            "rule_error": float(round(abs(y_actual.iloc[i] - y_rule_pred[i]), 1)),
        })

    return {
        "status": "ok",
        "is_trained": True,
        "metadata": metadata,
        "live_eval_mae": round(ai_mae, 2),
        "rule_based_mae": round(rule_mae, 2),
        "improvement_pct": round(((rule_mae - ai_mae) / rule_mae) * 100, 1) if rule_mae > 0 else 0,
        "sample_comparisons": samples,
    }
