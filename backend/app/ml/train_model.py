import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Any, Tuple
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.config import settings
from app.ml.synthetic_data import generate_synthetic_hospital_data

def train_waiting_time_model(n_samples: int = 7500) -> Dict[str, Any]:
    """
    Trains an AI regression pipeline on synthetic hospital queue flow data
    to predict patient wait times with high accuracy and low latency.
    """
    print(f"[{datetime.utcnow().isoformat()}] Generating {n_samples} synthetic training records...")
    df = generate_synthetic_hospital_data(n_samples=n_samples, random_seed=42)

    X = df.drop(columns=["actual_wait_minutes"])
    y = df["actual_wait_minutes"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    numeric_features = [
        "queue_position",
        "active_doctors",
        "avg_consultation_time",
        "hour_of_day",
        "day_of_week",
        "arrival_velocity",
    ]
    categorical_features = ["department_code", "priority"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
        ]
    )

    regressor = RandomForestRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )

    model_pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", regressor),
        ]
    )

    print("Fitting model pipeline...")
    model_pipeline.fit(X_train, y_train)

    # Evaluate ML Model
    y_pred = model_pipeline.predict(X_test)
    y_pred = np.maximum(1.0, y_pred)  # Floor at 1 min

    mae = float(mean_absolute_error(y_test, y_pred))
    mse = float(mean_squared_error(y_test, y_pred))
    rmse = float(np.sqrt(mse))
    r2 = float(r2_score(y_test, y_pred))

    # Evaluate Baseline Rule-Based Estimator on same test split for direct benchmark
    baseline_pred = np.maximum(
        2.0,
        ((X_test["queue_position"] - 1) * (X_test["avg_consultation_time"] / np.maximum(1, X_test["active_doctors"])))
    )
    baseline_mae = float(mean_absolute_error(y_test, baseline_pred))
    baseline_rmse = float(np.sqrt(mean_squared_error(y_test, baseline_pred)))

    # Feature importances extraction
    cat_encoder = model_pipeline.named_steps["preprocessor"].named_transformers_["cat"]
    encoded_cat_names = list(cat_encoder.get_feature_names_out(categorical_features))
    all_feature_names = numeric_features + encoded_cat_names
    importances = model_pipeline.named_steps["regressor"].feature_importances_

    feature_importance_dict = {
        name: float(round(imp * 100, 2))
        for name, imp in sorted(zip(all_feature_names, importances), key=lambda x: x[1], reverse=True)
    }

    # Save artifact
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    save_data = {
        "pipeline": model_pipeline,
        "metadata": {
            "model_name": "RandomForest_WaitTime_Regressor_v1",
            "training_date": datetime.utcnow().isoformat(),
            "sample_size": n_samples,
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "r2_score": round(r2, 4),
            "baseline_rule_mae": round(baseline_mae, 2),
            "baseline_rule_rmse": round(baseline_rmse, 2),
            "feature_importances": feature_importance_dict,
            "synthetic_notice": "Trained on simulated hospital queuing distributions. Illustrative demo - non-clinical use.",
        }
    }

    joblib.dump(save_data, settings.MODEL_PATH)
    print(f"Model successfully saved to {settings.MODEL_PATH}")
    print(f"Metrics -> ML MAE: {mae:.2f} min | Baseline MAE: {baseline_mae:.2f} min | R²: {r2:.4f}")

    return save_data["metadata"]

if __name__ == "__main__":
    train_waiting_time_model()
