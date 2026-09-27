import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text, Enum, Index
)
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    STAFF = "staff"
    PATIENT = "patient"

class QueueStatus(str, enum.Enum):
    WAITING = "waiting"
    CALLED = "called"
    IN_CONSULTATION = "in_consultation"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class PriorityLevel(str, enum.Enum):
    ROUTINE = "routine"
    FOLLOW_UP = "follow_up"
    URGENT_REVIEW = "urgent_review"  # Flagged by hospital triage/staff

class DoctorStatus(str, enum.Enum):
    AVAILABLE = "available"
    IN_CONSULTATION = "in_consultation"
    ON_BREAK = "on_break"
    OFFLINE = "offline"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.PATIENT, nullable=False)
    is_active = Column(Boolean, default=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    department = relationship("Department", back_populates="staff_members")
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False)

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(10), unique=True, index=True, nullable=False)  # e.g., CARD, PED, ORTH
    avg_consultation_time = Column(Float, default=15.0)  # Standard average in minutes
    is_active = Column(Boolean, default=True)
    icon = Column(String(50), default="Activity")
    color = Column(String(30), default="#0284C7")
    description = Column(String(255), nullable=True)
    total_rooms = Column(Integer, default=3)

    # Relationships
    staff_members = relationship("User", back_populates="department")
    doctors = relationship("Doctor", back_populates="department")
    queue_entries = relationship("QueueEntry", back_populates="department")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    room_number = Column(String(20), nullable=False)
    status = Column(Enum(DoctorStatus), default=DoctorStatus.AVAILABLE, nullable=False)
    current_ticket_id = Column(Integer, nullable=True)
    avg_service_time = Column(Float, default=15.0)  # Specific doctor's calculated average
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="doctor_profile")
    department = relationship("Department", back_populates="doctors")
    assigned_queues = relationship("QueueEntry", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_code = Column(String(20), unique=True, index=True, nullable=False)  # e.g. QC-P-1001
    full_name = Column(String(120), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)  # Male, Female, Other
    phone = Column(String(20), nullable=False)
    email = Column(String(120), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    queue_entries = relationship("QueueEntry", back_populates="patient")

class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(30), unique=True, index=True, nullable=False)  # e.g. QC-CARD-101
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    
    priority = Column(Enum(PriorityLevel), default=PriorityLevel.ROUTINE, nullable=False)
    status = Column(Enum(QueueStatus), default=QueueStatus.WAITING, index=True, nullable=False)
    queue_position = Column(Integer, default=1, index=True)
    
    predicted_wait_minutes = Column(Float, default=0.0)
    actual_wait_minutes = Column(Float, nullable=True)
    actual_consultation_minutes = Column(Float, nullable=True)
    
    registered_at = Column(DateTime, default=datetime.utcnow, index=True)
    called_at = Column(DateTime, nullable=True)
    consultation_started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    lookup_hash = Column(String(32), index=True, nullable=False)  # 6-8 char secure PIN for private tracking
    notes = Column(String(255), nullable=True)
    audit_notes = Column(Text, nullable=True)

    # Relationships
    patient = relationship("Patient", back_populates="queue_entries")
    department = relationship("Department", back_populates="queue_entries")
    doctor = relationship("Doctor", back_populates="assigned_queues")
    audit_logs = relationship("QueueAuditLog", back_populates="queue_entry")

    __table_args__ = (
        Index("idx_dept_status_pos", "department_id", "status", "queue_position"),
    )

class QueueAuditLog(Base):
    __tablename__ = "queue_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    queue_entry_id = Column(Integer, ForeignKey("queue_entries.id"), nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    previous_position = Column(Integer, nullable=False)
    new_position = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    queue_entry = relationship("QueueEntry", back_populates="audit_logs")
    changed_by = relationship("User")

class AIModelMetric(Base):
    __tablename__ = "ai_model_metrics"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), default="RandomForest_WaitTime_v1")
    training_date = Column(DateTime, default=datetime.utcnow)
    mae = Column(Float, nullable=False)
    rmse = Column(Float, nullable=False)
    r2_score = Column(Float, nullable=False)
    sample_size = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    feature_importance_json = Column(Text, nullable=True)
