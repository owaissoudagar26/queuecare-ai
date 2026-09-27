from datetime import timedelta
from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import User, UserRole, Department, Doctor
from app.schemas import Token, LoginRequest, UserResponse, UserCreate
from app.auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, get_admin_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value, "user_id": user.id},
        expires_delta=access_token_expires,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "user_id": user.id,
        "full_name": user.full_name,
        "department_id": user.department_id,
    }

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/demo-accounts")
def get_demo_credentials():
    """Returns list of pre-configured demo logins for quick role testing"""
    return {
        "accounts": [
            {"role": "Administrator", "email": "admin@queuecare.ai", "password": "QueueCare2026!", "description": "Full access to dashboard, settings, AI model inspection, and analytics."},
            {"role": "Doctor (Cardiology)", "email": "dr.sarah@queuecare.ai", "password": "QueueCare2026!", "description": "Access to Cardiology consultation room, call next patient, status updates."},
            {"role": "Doctor (Pediatrics)", "email": "dr.james@queuecare.ai", "password": "QueueCare2026!", "description": "Access to Pediatrics queue and consultation room."},
            {"role": "Front Desk / Staff", "email": "staff@queuecare.ai", "password": "QueueCare2026!", "description": "Patient intake, queue reordering, desk triage."},
            {"role": "Patient Demo", "email": "patient@queuecare.ai", "password": "QueueCare2026!", "description": "Patient self-service check-in and queue tracking."},
        ]
    }

@router.post("/register-user", response_model=UserResponse)
def register_user(user_in: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        department_id=user_in.department_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
