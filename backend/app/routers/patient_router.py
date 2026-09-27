from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Patient, QueueEntry
from app.schemas import PatientResponse, PatientCreate
from app.auth import get_staff_or_admin

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.get("", response_model=List[PatientResponse])
def list_patients(search: Optional[str] = None, db: Session = Depends(get_db), current_user = Depends(get_staff_or_admin)):
    query = db.query(Patient)
    if search:
        query = query.filter(
            (Patient.full_name.ilike(f"%{search}%")) |
            (Patient.phone.ilike(f"%{search}%")) |
            (Patient.patient_code.ilike(f"%{search}%"))
        )
    return query.order_by(Patient.created_at.desc()).limit(100).all()

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: int, db: Session = Depends(get_db), current_user = Depends(get_staff_or_admin)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient
