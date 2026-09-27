from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models import UserRole, QueueStatus, PriorityLevel, DoctorStatus

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    full_name: str
    department_id: Optional[int] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None

class LoginRequest(BaseModel):
    email: str
    password: str

# User Schemas
class UserBase(BaseModel):
    email: str
    full_name: str
    role: UserRole
    department_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Department Schemas
class DepartmentBase(BaseModel):
    name: str
    code: str
    avg_consultation_time: float = 15.0
    is_active: bool = True
    icon: str = "Activity"
    color: str = "#0284C7"
    description: Optional[str] = None
    total_rooms: int = 3

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    id: int
    active_doctors_count: Optional[int] = 0
    waiting_patients_count: Optional[int] = 0
    avg_predicted_wait_minutes: Optional[float] = 0.0

    class Config:
        from_attributes = True

# Doctor Schemas
class DoctorBase(BaseModel):
    room_number: str
    status: DoctorStatus = DoctorStatus.AVAILABLE
    avg_service_time: float = 15.0

class DoctorCreate(DoctorBase):
    user_id: int
    department_id: int

class DoctorResponse(DoctorBase):
    id: int
    user_id: int
    department_id: int
    doctor_name: Optional[str] = None
    department_name: Optional[str] = None
    current_ticket_id: Optional[int] = None
    current_ticket_number: Optional[str] = None

    class Config:
        from_attributes = True

# Patient Schemas
class PatientCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    age: int = Field(..., ge=0, le=130)
    gender: str = Field(..., description="Male, Female, Other")
    phone: str = Field(..., min_length=7, max_length=20)
    email: Optional[str] = None

class PatientResponse(BaseModel):
    id: int
    patient_code: str
    full_name: str
    age: int
    gender: str
    phone: str
    email: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Queue Registration & Entry Schemas
class QueueRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    age: int = Field(..., ge=0, le=130)
    gender: str
    phone: str
    email: Optional[str] = None
    department_id: int
    priority: PriorityLevel = PriorityLevel.ROUTINE
    notes: Optional[str] = None

class QueueEntryResponse(BaseModel):
    id: int
    ticket_number: str
    patient_id: int
    patient_name: Optional[str] = None
    department_id: int
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    room_number: Optional[str] = None
    priority: PriorityLevel
    status: QueueStatus
    queue_position: int
    predicted_wait_minutes: float
    actual_wait_minutes: Optional[float] = None
    actual_consultation_minutes: Optional[float] = None
    registered_at: datetime
    called_at: Optional[datetime] = None
    consultation_started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    lookup_hash: str
    notes: Optional[str] = None
    audit_notes: Optional[str] = None

    class Config:
        from_attributes = True

class QueueLookupRequest(BaseModel):
    ticket_number: str
    lookup_code: str

class QueueLookupResponse(BaseModel):
    ticket_number: str
    department_name: str
    department_code: str
    status: QueueStatus
    queue_position: int
    patients_ahead: int
    predicted_wait_minutes: float
    is_ai_estimate: bool = True
    assigned_room: Optional[str] = None
    doctor_name: Optional[str] = None
    registered_at: datetime
    status_updated_at: Optional[datetime] = None
    disclaimer: str = "This waiting time is an AI-generated estimate based on hospital queue velocity. It is not a guaranteed appointment time."

class QueueReorderRequest(BaseModel):
    queue_entry_id: int
    new_position: int
    reason: str = Field(..., min_length=5, description="Mandatory clinical/administrative reason for audit log")

class QueueStatusUpdateRequest(BaseModel):
    status: QueueStatus
    doctor_id: Optional[int] = None
    notes: Optional[str] = None

# AI & Prediction Schemas
class WaitTimePredictionRequest(BaseModel):
    department_id: int
    queue_position: int
    active_doctors_count: Optional[int] = 1
    priority: Optional[PriorityLevel] = PriorityLevel.ROUTINE
    hour_of_day: Optional[int] = None
    day_of_week: Optional[int] = None

class WaitTimePredictionResponse(BaseModel):
    predicted_wait_minutes: float
    predicted_range_min: float
    predicted_range_max: float
    is_ai_predicted: bool
    is_fallback: bool
    model_version: str
    calculation_breakdown: Dict[str, Any]
    disclaimer: str

class ModelEvaluationResponse(BaseModel):
    model_name: str
    training_date: datetime
    sample_size: int
    mae: float
    rmse: float
    r2_score: float
    baseline_rule_mae: float
    baseline_rule_rmse: float
    feature_importances: Dict[str, float]
    synthetic_notice: str

# Analytics Schemas
class KPISummaryResponse(BaseModel):
    total_patients_today: int
    currently_waiting: int
    in_consultation: int
    completed_today: int
    avg_wait_minutes_today: float
    avg_consultation_minutes_today: float
    active_doctors_count: int
    bottleneck_departments: List[str]

class HourlyArrivalData(BaseModel):
    hour: str
    arrival_count: int
    completed_count: int

class DepartmentWaitStat(BaseModel):
    department_id: int
    department_name: str
    department_code: str
    waiting_count: int
    avg_wait_minutes: float
    avg_consultation_minutes: float
    active_doctors: int
    is_bottleneck: bool
