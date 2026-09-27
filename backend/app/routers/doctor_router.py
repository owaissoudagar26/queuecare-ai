from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Doctor, DoctorStatus, User, Department, QueueEntry, QueueStatus
from app.schemas import DoctorResponse
from app.auth import get_current_user, get_staff_or_admin
from app.services.queue_service import QueueService
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/doctors", tags=["Doctors & Staff"])

@router.get("", response_model=List[DoctorResponse])
def list_doctors(db: Session = Depends(get_db)):
    doctors = db.query(Doctor).all()
    results = []
    for d in doctors:
        ticket = db.query(QueueEntry).filter(QueueEntry.id == d.current_ticket_id).first() if d.current_ticket_id else None
        results.append(DoctorResponse(
            id=d.id,
            user_id=d.user_id,
            department_id=d.department_id,
            room_number=d.room_number,
            status=d.status,
            avg_service_time=d.avg_service_time,
            doctor_name=d.user.full_name if d.user else "Unknown Doctor",
            department_name=d.department.name if d.department else "General",
            current_ticket_id=d.current_ticket_id,
            current_ticket_number=ticket.ticket_number if ticket else None
        ))
    return results

@router.get("/me", response_model=DoctorResponse)
def get_my_doctor_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doc:
        # If user is admin or staff without doctor profile, find or create virtual view
        raise HTTPException(status_code=404, detail="No doctor profile associated with current account")
    
    ticket = db.query(QueueEntry).filter(QueueEntry.id == doc.current_ticket_id).first() if doc.current_ticket_id else None
    return DoctorResponse(
        id=doc.id,
        user_id=doc.user_id,
        department_id=doc.department_id,
        room_number=doc.room_number,
        status=doc.status,
        avg_service_time=doc.avg_service_time,
        doctor_name=current_user.full_name,
        department_name=doc.department.name if doc.department else "",
        current_ticket_id=doc.current_ticket_id,
        current_ticket_number=ticket.ticket_number if ticket else None
    )

@router.patch("/{doctor_id}/status")
async def update_doctor_status(
    doctor_id: int,
    new_status: DoctorStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_or_admin)
):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")

    doc.status = new_status
    db.commit()
    
    # Recalculate department queue since doctor capacity changed
    QueueService.recalculate_department_queue(db, doc.department_id)

    # Broadcast event
    await ws_manager.broadcast("DOCTOR_STATUS_CHANGED", {
        "doctor_id": doc.id,
        "doctor_name": doc.user.full_name if doc.user else "",
        "status": doc.status.value,
        "department_id": doc.department_id
    })

    return {"message": f"Status updated to {new_status.value}", "doctor_id": doc.id, "status": doc.status.value}
