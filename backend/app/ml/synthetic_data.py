import numpy as np
import pandas as pd
from typing import Tuple

def generate_synthetic_hospital_data(n_samples: int = 6000, random_seed: int = 42) -> pd.DataFrame:
    """
    Generates synthetic historical hospital consultation data simulating realistic
    queue wait times based on queue length, department characteristics, doctor availability,
    time-of-day arrival surges, and triage priority.
    """
    np.random.seed(random_seed)

    departments = [
        {"code": "CARD", "name": "Cardiology", "base_time": 20.0, "time_std": 6.0},
        {"code": "PED", "name": "Pediatrics", "base_time": 14.0, "time_std": 4.0},
        {"code": "ORTH", "name": "Orthopedics", "base_time": 18.0, "time_std": 5.0},
        {"code": "GEN", "name": "General Medicine", "base_time": 12.0, "time_std": 3.5},
        {"code": "EMERG", "name": "Emergency & Triage", "base_time": 25.0, "time_std": 8.0},
        {"code": "ENT", "name": "Ear, Nose & Throat", "base_time": 15.0, "time_std": 4.0},
    ]

    dept_probs = [0.18, 0.20, 0.15, 0.25, 0.10, 0.12]
    selected_depts_idx = np.random.choice(len(departments), size=n_samples, p=dept_probs)

    dept_codes = [departments[i]["code"] for i in selected_depts_idx]
    base_times = np.array([departments[i]["base_time"] for i in selected_depts_idx])
    time_stds = np.array([departments[i]["time_std"] for i in selected_depts_idx])

    # Queue position (how many people ahead in the department queue)
    queue_positions = np.random.exponential(scale=4.5, size=n_samples).astype(int) + 1
    queue_positions = np.clip(queue_positions, 1, 30)

    # Active doctors on duty (1 to 5)
    active_doctors = np.random.choice([1, 2, 3, 4, 5], size=n_samples, p=[0.20, 0.40, 0.25, 0.10, 0.05])

    # Time of day (8 AM to 8 PM / 20:00)
    # Peak hours around 9-11 AM and 2-4 PM
    hour_probs = np.array([
        0.04, 0.12, 0.15, 0.12, 0.08, 0.06, 0.10, 0.13, 0.09, 0.05, 0.04, 0.02
    ])  # Hours 8 to 19
    hour_probs = hour_probs / hour_probs.sum()
    hours = np.random.choice(np.arange(8, 20), size=n_samples, p=hour_probs)

    # Day of week (0 = Monday, 6 = Sunday). Mondays & Tuesdays have higher surge
    day_probs = [0.22, 0.19, 0.16, 0.15, 0.14, 0.08, 0.06]
    days_of_week = np.random.choice(np.arange(7), size=n_samples, p=day_probs)

    # Arrival velocity (patients arrived in past 30 mins)
    arrival_velocities = np.random.poisson(lam=4.0, size=n_samples)
    # Peak hour surge factor on velocity
    is_peak = ((hours >= 9) & (hours <= 11)) | ((hours >= 14) & (hours <= 16))
    arrival_velocities = arrival_velocities + (is_peak * np.random.randint(1, 5, size=n_samples))

    # Priority category
    priorities = np.random.choice(["routine", "follow_up", "urgent_review"], size=n_samples, p=[0.70, 0.22, 0.08])

    # Stochastic actual wait time synthesis using queue theory with realistic noise
    # M/M/c queueing approximation: Wait ~ (Queue_pos - 1) * (base_time / active_doctors) * Congestion + DoctorNoise
    priority_modifier = np.where(priorities == "urgent_review", 0.35, np.where(priorities == "follow_up", 0.85, 1.0))
    time_surge_modifier = np.where(is_peak, 1.20, 0.95)
    monday_modifier = np.where(days_of_week == 0, 1.15, 1.0)
    velocity_congestion = 1.0 + (arrival_velocities * 0.02)

    effective_service_time = np.random.normal(loc=base_times, scale=time_stds)
    effective_service_time = np.clip(effective_service_time, 5.0, 60.0)

    # Raw expected wait time
    raw_wait = (
        ((queue_positions - 1) * (effective_service_time / active_doctors))
        * priority_modifier
        * time_surge_modifier
        * monday_modifier
        * velocity_congestion
    )

    # Realistic random variation (doctor delays, patient paperwork, room sanitization)
    unpredictable_delay = np.random.gamma(shape=2.0, scale=2.5, size=n_samples)
    actual_wait_minutes = np.maximum(2.0, raw_wait + unpredictable_delay)

    # Round to 1 decimal place
    actual_wait_minutes = np.round(actual_wait_minutes, 1)

    df = pd.DataFrame({
        "department_code": dept_codes,
        "queue_position": queue_positions,
        "active_doctors": active_doctors,
        "avg_consultation_time": base_times,
        "hour_of_day": hours,
        "day_of_week": days_of_week,
        "arrival_velocity": arrival_velocities,
        "priority": priorities,
        "actual_wait_minutes": actual_wait_minutes,
    })

    return df

if __name__ == "__main__":
    data = generate_synthetic_hospital_data(1000)
    print(f"Generated {len(data)} synthetic records:")
    print(data.head())
    print(data.describe())
