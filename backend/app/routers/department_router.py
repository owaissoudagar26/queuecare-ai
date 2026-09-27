from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Department, Doctor, QueueEntry, QueueStatus, DoctorStatus, User
from app.schemas import DepartmentResponse, DepartmentCreate
from app.auth import get_admin_user

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("", response_model=List[DepartmentResponse])
def get_departments(db: Session = Depends(get_db)):
    departments = db.query(Department).filter(Department.is_active == True).all()
    results = []
    
    for dept in departments:
        # Calculate active doctors
        active_docs = db.query(Doctor).filter(
            Doctor.department_id == dept.id,
            Doctor.status.in_([DoctorStatus.AVAILABLE, DoctorStatus.IN_CONSULTATION])
        ).count()
        
        # Calculate waiting patients
        waiting_count = db.query(QueueEntry).filter(
            QueueEntry.department_id == dept.id,
            QueueEntry.status == QueueStatus.WAITING
        ).count()
        
        # Calculate avg predicted wait
        avg_wait = db.query(func.avg(QueueEntry.predicted_wait_minutes)).filter(
            QueueEntry.department_id == dept.id,
            QueueEntry.status == QueueStatus.WAITING
        ).scalar() or 0.0

        dept_dict = {
            "id": dept.id,
            "name": dept.name,
            "code": dept.code,
            "avg_consultation_time": dept.avg_consultation_time,
            "is_active": dept.is_active,
            "icon": dept.icon,
            "color": dept.color,
            "description": dept.description,
            "total_rooms": dept.total_rooms,
            "active_doctors_count": active_docs,
            "waiting_patients_count": waiting_count,
            "avg_predicted_wait_minutes": round(avg_wait, 1),
        }
        results.append(DepartmentResponse(**dept_dict))
    
    return results

@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department_by_id(department_id: int, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    active_docs = db.query(Doctor).filter(
        Doctor.department_id == dept.id,
        Doctor.status.in_([DoctorStatus.AVAILABLE, DoctorStatus.IN_CONSULTATION])
    ).count()
    
    waiting_count = db.query(QueueEntry).filter(
        QueueEntry.department_id == dept.id,
        QueueEntry.status == QueueStatus.WAITING
    ).count()

    avg_wait = db.query(func.avg(QueueEntry.predicted_wait_minutes)).filter(
        QueueEntry.department_id == dept.id,
        QueueEntry.status == QueueStatus.WAITING
    ).scalar() or 0.0

    return DepartmentResponse(
        id=dept.id,
        name=dept.name,
        code=dept.code,
        avg_consultation_time=dept.avg_consultation_time,
        is_active=dept.is_active,
        icon=dept.icon,
        color=dept.color,
        description=dept.description,
        total_rooms=dept.total_rooms,
        active_doctors_count=active_docs,
        waiting_patients_count=waiting_count,
        avg_predicted_wait_minutes=round(avg_wait, 1)
    )

@router.post("", response_model=DepartmentResponse)
def create_department(dept_in: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    existing = db.query(Department).filter(Department.code == dept_in.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Department code {dept_in.code} already exists")
    
    dept = Department(
        name=dept_in.name,
        code=dept_in.code.upper(),
        avg_consultation_time=dept_in.avg_consultation_time,
        icon=dept_in.icon,
        color=dept_in.color,
        description=dept_in.description,
        total_rooms=dept_in.total_rooms
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return DepartmentResponse(
        id=dept.id,
        name=dept.name,
        code=dept.code,
        avg_consultation_time=dept.avg_consultation_time,
        is_active=dept.is_active,
        icon=dept.icon,
        color=dept.color,
        description=dept.description,
        total_rooms=dept.total_rooms,
        active_doctors_count=0,
        waiting_patients_count=0,
        avg_predicted_wait_minutes=0.0
    )
