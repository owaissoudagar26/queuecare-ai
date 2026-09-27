from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.database import get_db
from app.models import (
    QueueEntry, QueueStatus, PriorityLevel, Department, Doctor,
    Patient, User, QueueAuditLog
)
from app.schemas import (
    QueueRegisterRequest, QueueEntryResponse, QueueLookupRequest,
    QueueLookupResponse, QueueReorderRequest, QueueStatusUpdateRequest
)
from app.auth import get_current_user, get_staff_or_admin, get_doctor_user
from app.services.queue_service import QueueService
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/queue", tags=["Queue Management"])

def _build_queue_response(entry: QueueEntry) -> QueueEntryResponse:
    doc_name = entry.doctor.user.full_name if (entry.doctor and entry.doctor.user) else None
    room = entry.doctor.room_number if entry.doctor else None
    return QueueEntryResponse(
        id=entry.id,
        ticket_number=entry.ticket_number,
        patient_id=entry.patient_id,
        patient_name=entry.patient.full_name if entry.patient else "Anonymous",
        department_id=entry.department_id,
        department_name=entry.department.name if entry.department else "General",
        department_code=entry.department.code if entry.department else "GEN",
        doctor_id=entry.doctor_id,
        doctor_name=doc_name,
        room_number=room,
        priority=entry.priority,
        status=entry.status,
        queue_position=entry.queue_position,
        predicted_wait_minutes=entry.predicted_wait_minutes,
        actual_wait_minutes=entry.actual_wait_minutes,
        actual_consultation_minutes=entry.actual_consultation_minutes,
        registered_at=entry.registered_at,
        called_at=entry.called_at,
        consultation_started_at=entry.consultation_started_at,
        completed_at=entry.completed_at,
        lookup_hash=entry.lookup_hash,
        notes=entry.notes,
        audit_notes=entry.audit_notes,
    )

@router.post("/register", response_model=QueueEntryResponse)
async def register_patient_for_queue(req: QueueRegisterRequest, db: Session = Depends(get_db)):
    try:
        entry = QueueService.register_patient_to_queue(
            db=db,
            full_name=req.full_name,
            age=req.age,
            gender=req.gender,
            phone=req.phone,
            email=req.email,
            department_id=req.department_id,
            priority=req.priority,
            notes=req.notes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    resp = _build_queue_response(entry)

    # Broadcast event
    await ws_manager.broadcast("QUEUE_UPDATED", {
        "event": "PATIENT_REGISTERED",
        "department_id": entry.department_id,
        "ticket_number": entry.ticket_number
    })

    return resp

@router.get("/live", response_model=List[QueueEntryResponse])
def get_live_queue(
    department_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(QueueEntry)

    if department_id:
        query = query.filter(QueueEntry.department_id == department_id)

    if status_filter:
        statuses = [s.strip() for s in status_filter.split(",")]
        query = query.filter(QueueEntry.status.in_(statuses))
    else:
        query = query.filter(QueueEntry.status.in_([
            QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_CONSULTATION
        ]))

    if priority_filter:
        query = query.filter(QueueEntry.priority == priority_filter)

    if search:
        query = query.join(Patient).filter(
            (QueueEntry.ticket_number.ilike(f"%{search}%")) |
            (Patient.full_name.ilike(f"%{search}%")) |
            (Patient.phone.ilike(f"%{search}%"))
        )

    status_order = case(
        (QueueEntry.status == QueueStatus.IN_CONSULTATION, 0),
        (QueueEntry.status == QueueStatus.CALLED, 1),
        (QueueEntry.status == QueueStatus.WAITING, 2),
        else_=3
    )

    entries = query.order_by(
        status_order,
        QueueEntry.queue_position.asc(),
        QueueEntry.registered_at.asc()
    ).all()

    return [_build_queue_response(e) for e in entries]

@router.post("/lookup", response_model=QueueLookupResponse)
def lookup_patient_queue_status(req: QueueLookupRequest, db: Session = Depends(get_db)):
    clean_ticket = req.ticket_number.strip().upper()
    clean_pin = req.lookup_code.strip().upper()

    entry = db.query(QueueEntry).filter(
        QueueEntry.ticket_number == clean_ticket,
        QueueEntry.lookup_hash == clean_pin
    ).first()

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Queue entry not found. Please verify your ticket number and lookup PIN."
        )

    patients_ahead = 0
    if entry.status == QueueStatus.WAITING:
        patients_ahead = db.query(QueueEntry).filter(
            QueueEntry.department_id == entry.department_id,
            QueueEntry.status == QueueStatus.WAITING,
            QueueEntry.queue_position < entry.queue_position
        ).count()

    doc_name = entry.doctor.user.full_name if (entry.doctor and entry.doctor.user) else None
    room_no = entry.doctor.room_number if entry.doctor else None

    return QueueLookupResponse(
        ticket_number=entry.ticket_number,
        department_name=entry.department.name if entry.department else "General",
        department_code=entry.department.code if entry.department else "GEN",
        status=entry.status,
        queue_position=entry.queue_position,
        patients_ahead=patients_ahead,
        predicted_wait_minutes=entry.predicted_wait_minutes,
        is_ai_estimate=True,
        assigned_room=room_no,
        doctor_name=doc_name,
        registered_at=entry.registered_at,
        status_updated_at=entry.consultation_started_at or entry.called_at or entry.registered_at
    )

@router.get("/public-kiosk")
def get_public_kiosk_board(db: Session = Depends(get_db)):
    departments = db.query(Department).filter(Department.is_active == True).all()
    board = []

    for dept in departments:
        serving_entries = db.query(QueueEntry).filter(
            QueueEntry.department_id == dept.id,
            QueueEntry.status.in_([QueueStatus.CALLED, QueueStatus.IN_CONSULTATION])
        ).order_by(QueueEntry.called_at.desc()).all()

        serving_list = []
        for s in serving_entries:
            room = s.doctor.room_number if s.doctor else "Intake"
            serving_list.append({
                "ticket_number": s.ticket_number,
                "room": room,
                "status": s.status.value,
                "called_at": s.called_at.isoformat() if s.called_at else None
            })

        next_waiting = db.query(QueueEntry).filter(
            QueueEntry.department_id == dept.id,
            QueueEntry.status == QueueStatus.WAITING
        ).order_by(QueueEntry.queue_position.asc()).limit(5).all()

        waiting_list = [{
            "ticket_number": w.ticket_number,
            "position": w.queue_position,
            "est_wait": round(w.predicted_wait_minutes)
        } for w in next_waiting]

        board.append({
            "department_id": dept.id,
            "department_name": dept.name,
            "department_code": dept.code,
            "color": dept.color,
            "icon": dept.icon,
            "now_serving": serving_list,
            "next_in_line": waiting_list,
            "total_waiting": db.query(QueueEntry).filter(
                QueueEntry.department_id == dept.id,
                QueueEntry.status == QueueStatus.WAITING
            ).count()
        })

    return {"kiosk_board": board, "last_updated": datetime.utcnow().isoformat()}

@router.post("/call-next", response_model=Optional[QueueEntryResponse])
async def call_next_patient(
    doctor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_or_admin)
):
    target_doc_id = doctor_id
    if not target_doc_id:
        doc = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if doc:
            target_doc_id = doc.id
        else:
            raise HTTPException(status_code=400, detail="Doctor ID required")

    entry = QueueService.call_next_patient(db, target_doc_id)
    if not entry:
        return None

    resp = _build_queue_response(entry)
    await ws_manager.broadcast("PATIENT_CALLED", {
        "ticket_number": entry.ticket_number,
        "department_id": entry.department_id,
        "room_number": resp.room_number,
        "doctor_name": resp.doctor_name
    })

    return resp

@router.post("/{queue_entry_id}/start-consultation", response_model=QueueEntryResponse)
async def start_consultation(
    queue_entry_id: int,
    doctor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_or_admin)
):
    target_doc_id = doctor_id
    if not target_doc_id:
        doc = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if doc:
            target_doc_id = doc.id
        else:
            entry_obj = db.query(QueueEntry).filter(QueueEntry.id == queue_entry_id).first()
            target_doc_id = entry_obj.doctor_id if entry_obj and entry_obj.doctor_id else 1

    entry = QueueService.start_consultation(db, queue_entry_id, target_doc_id)
    resp = _build_queue_response(entry)

    await ws_manager.broadcast("CONSULTATION_STARTED", {
        "ticket_number": entry.ticket_number,
        "department_id": entry.department_id
    })

    return resp

@router.post("/{queue_entry_id}/complete-consultation", response_model=QueueEntryResponse)
async def complete_consultation(
    queue_entry_id: int,
    req: Optional[QueueStatusUpdateRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_or_admin)
):
    notes = req.notes if req else None
    entry = QueueService.complete_consultation(db, queue_entry_id, notes=notes)
    resp = _build_queue_response(entry)

    await ws_manager.broadcast("CONSULTATION_COMPLETED", {
        "ticket_number": entry.ticket_number,
        "department_id": entry.department_id
    })

    return resp

@router.post("/reorder", response_model=QueueEntryResponse)
async def reorder_queue(
    req: QueueReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_or_admin)
):
    try:
        entry = QueueService.reorder_queue_position(
            db=db,
            queue_entry_id=req.queue_entry_id,
            new_position=req.new_position,
            user_id=current_user.id,
            reason=req.reason
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    resp = _build_queue_response(entry)

    await ws_manager.broadcast("QUEUE_REORDERED", {
        "department_id": entry.department_id,
        "ticket_number": entry.ticket_number,
        "new_position": req.new_position,
        "reason": req.reason
    })

    return resp

@router.get("/{queue_entry_id}/audit-history")
def get_queue_audit_logs(
    queue_entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_or_admin)
):
    logs = db.query(QueueAuditLog).filter(QueueAuditLog.queue_entry_id == queue_entry_id).order_by(QueueAuditLog.timestamp.desc()).all()
    return [{
        "id": log.id,
        "changed_by": log.changed_by.full_name if log.changed_by else "Staff",
        "previous_position": log.previous_position,
        "new_position": log.new_position,
        "reason": log.reason,
        "timestamp": log.timestamp.isoformat()
    } for log in logs]

@router.delete("/{queue_entry_id}/cancel")
async def cancel_queue_entry(
    queue_entry_id: int,
    reason: Optional[str] = "Patient cancelled / No-show",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_or_admin)
):
    entry = db.query(QueueEntry).filter(QueueEntry.id == queue_entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    dept_id = entry.department_id
    entry.status = QueueStatus.CANCELLED
    entry.notes = f"{entry.notes or ''} | Cancelled: {reason}".strip(" | ")
    db.commit()

    QueueService.recalculate_department_queue(db, dept_id)

    await ws_manager.broadcast("QUEUE_UPDATED", {
        "event": "ENTRY_CANCELLED",
        "department_id": dept_id,
        "ticket_number": entry.ticket_number
    })

    return {"message": "Queue entry cancelled", "ticket_number": entry.ticket_number}
