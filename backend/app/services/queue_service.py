import secrets
import string
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.models import (
    QueueEntry, QueueStatus, PriorityLevel, Department, Doctor,
    DoctorStatus, Patient, QueueAuditLog, User
)
from app.services.ai_service import ai_service
from app.websocket_manager import ws_manager

def generate_ticket_number(db: Session, department_code: str) -> str:
    """Generates sequential daily ticket like QC-CARD-101"""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    count = db.query(QueueEntry).filter(
        QueueEntry.registered_at >= today_start,
        QueueEntry.ticket_number.like(f"QC-{department_code}-%")
    ).count()
    return f"QC-{department_code}-{101 + count}"

def generate_lookup_pin() -> str:
    """Generates secure 6-character alphanumeric PIN for patient lookup"""
    chars = string.ascii_uppercase + string.digits
    safe_chars = [c for c in chars if c not in ('O', '0', 'I', '1')]
    return "".join(secrets.choice(safe_chars) for _ in range(6))

class QueueService:
    @staticmethod
    def recalculate_department_queue(db: Session, department_id: int):
        """
        Recalculates sequence numbers (1, 2, 3...) and AI predicted wait times
        for all WAITING patients in a given department.
        """
        dept = db.query(Department).filter(Department.id == department_id).first()
        if not dept:
            return

        active_doctors = db.query(Doctor).filter(
            Doctor.department_id == department_id,
            Doctor.status.in_([DoctorStatus.AVAILABLE, DoctorStatus.IN_CONSULTATION])
        ).count()
        active_doctors = max(1, active_doctors)

        # Order waiting patients: urgent first, then queue position
        priority_order = case(
            (QueueEntry.priority == PriorityLevel.URGENT_REVIEW, 0),
            (QueueEntry.priority == PriorityLevel.FOLLOW_UP, 1),
            else_=2
        )

        waiting_entries = db.query(QueueEntry).filter(
            QueueEntry.department_id == department_id,
            QueueEntry.status == QueueStatus.WAITING
        ).order_by(
            priority_order,
            QueueEntry.queue_position.asc(),
            QueueEntry.registered_at.asc()
        ).all()

        for idx, entry in enumerate(waiting_entries, start=1):
            entry.queue_position = idx
            pred = ai_service.predict_wait_time(
                department_code=dept.code,
                queue_position=idx,
                active_doctors=active_doctors,
                avg_consultation_time=dept.avg_consultation_time,
                priority=entry.priority.value
            )
            entry.predicted_wait_minutes = pred["predicted_wait_minutes"]

        db.commit()

    @staticmethod
    def register_patient_to_queue(
        db: Session,
        full_name: str,
        age: int,
        gender: str,
        phone: str,
        department_id: int,
        priority: PriorityLevel = PriorityLevel.ROUTINE,
        email: Optional[str] = None,
        notes: Optional[str] = None
    ) -> QueueEntry:
        dept = db.query(Department).filter(Department.id == department_id).first()
        if not dept:
            raise ValueError(f"Department ID {department_id} not found")

        # Find or create patient
        patient = db.query(Patient).filter(Patient.phone == phone).first()
        if not patient:
            patient_count = db.query(Patient).count()
            patient = Patient(
                patient_code=f"QC-P-{1000 + patient_count + 1}",
                full_name=full_name,
                age=age,
                gender=gender,
                phone=phone,
                email=email,
            )
            db.add(patient)
            db.flush()

        # Generate ticket and pin
        ticket = generate_ticket_number(db, dept.code)
        lookup_pin = generate_lookup_pin()

        # Determine initial position at end of waiting queue
        last_pos = db.query(func.max(QueueEntry.queue_position)).filter(
            QueueEntry.department_id == department_id,
            QueueEntry.status == QueueStatus.WAITING
        ).scalar() or 0
        new_pos = last_pos + 1

        active_doctors = db.query(Doctor).filter(
            Doctor.department_id == department_id,
            Doctor.status.in_([DoctorStatus.AVAILABLE, DoctorStatus.IN_CONSULTATION])
        ).count()
        active_doctors = max(1, active_doctors)

        # AI Prediction
        pred = ai_service.predict_wait_time(
            department_code=dept.code,
            queue_position=new_pos,
            active_doctors=active_doctors,
            avg_consultation_time=dept.avg_consultation_time,
            priority=priority.value
        )

        entry = QueueEntry(
            ticket_number=ticket,
            patient_id=patient.id,
            department_id=dept.id,
            priority=priority,
            status=QueueStatus.WAITING,
            queue_position=new_pos,
            predicted_wait_minutes=pred["predicted_wait_minutes"],
            lookup_hash=lookup_pin,
            notes=notes,
            registered_at=datetime.utcnow()
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

        # Rebalance queue and recalculate positions
        QueueService.recalculate_department_queue(db, dept.id)
        db.refresh(entry)

        return entry

    @staticmethod
    def call_next_patient(db: Session, doctor_id: int) -> Optional[QueueEntry]:
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            raise ValueError(f"Doctor ID {doctor_id} not found")

        # Find next waiting patient in doctor's department
        next_entry = db.query(QueueEntry).filter(
            QueueEntry.department_id == doctor.department_id,
            QueueEntry.status == QueueStatus.WAITING
        ).order_by(
            QueueEntry.queue_position.asc()
        ).first()

        if not next_entry:
            return None

        next_entry.status = QueueStatus.CALLED
        next_entry.doctor_id = doctor.id
        next_entry.called_at = datetime.utcnow()
        
        doctor.current_ticket_id = next_entry.id
        db.commit()

        # Recalculate remaining waiting entries
        QueueService.recalculate_department_queue(db, doctor.department_id)
        db.refresh(next_entry)
        return next_entry

    @staticmethod
    def start_consultation(db: Session, queue_entry_id: int, doctor_id: int) -> QueueEntry:
        entry = db.query(QueueEntry).filter(QueueEntry.id == queue_entry_id).first()
        if not entry:
            raise ValueError(f"Queue entry {queue_entry_id} not found")

        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if doctor:
            doctor.status = DoctorStatus.IN_CONSULTATION
            doctor.current_ticket_id = entry.id

        entry.status = QueueStatus.IN_CONSULTATION
        entry.doctor_id = doctor_id
        entry.consultation_started_at = datetime.utcnow()
        
        # Calculate actual waiting time
        if entry.registered_at:
            delta = (datetime.utcnow() - entry.registered_at).total_seconds() / 60.0
            entry.actual_wait_minutes = max(1.0, round(delta, 1))

        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def complete_consultation(db: Session, queue_entry_id: int, notes: Optional[str] = None) -> QueueEntry:
        entry = db.query(QueueEntry).filter(QueueEntry.id == queue_entry_id).first()
        if not entry:
            raise ValueError(f"Queue entry {queue_entry_id} not found")

        entry.status = QueueStatus.COMPLETED
        entry.completed_at = datetime.utcnow()
        if notes:
            entry.notes = f"{entry.notes or ''} | Consultation Note: {notes}".strip(" | ")

        if entry.consultation_started_at:
            delta = (datetime.utcnow() - entry.consultation_started_at).total_seconds() / 60.0
            entry.actual_consultation_minutes = max(2.0, round(delta, 1))

        # Free up doctor
        if entry.doctor_id:
            doc = db.query(Doctor).filter(Doctor.id == entry.doctor_id).first()
            if doc:
                doc.status = DoctorStatus.AVAILABLE
                doc.current_ticket_id = None

        db.commit()
        
        # Recalculate waiting queue for that department
        QueueService.recalculate_department_queue(db, entry.department_id)
        db.refresh(entry)
        return entry

    @staticmethod
    def reorder_queue_position(
        db: Session,
        queue_entry_id: int,
        new_position: int,
        user_id: int,
        reason: str
    ) -> QueueEntry:
        """
        Manually reorders a patient's position in the queue with mandatory audit trail.
        """
        entry = db.query(QueueEntry).filter(QueueEntry.id == queue_entry_id).first()
        if not entry:
            raise ValueError(f"Queue entry {queue_entry_id} not found")

        old_position = entry.queue_position
        dept_id = entry.department_id

        # Record audit log
        audit = QueueAuditLog(
            queue_entry_id=entry.id,
            changed_by_user_id=user_id,
            previous_position=old_position,
            new_position=new_position,
            reason=reason,
            timestamp=datetime.utcnow()
        )
        db.add(audit)

        # Fetch other waiting patients
        waiting_entries = db.query(QueueEntry).filter(
            QueueEntry.department_id == dept_id,
            QueueEntry.status == QueueStatus.WAITING,
            QueueEntry.id != entry.id
        ).order_by(QueueEntry.queue_position.asc()).all()

        target_idx = max(0, min(new_position - 1, len(waiting_entries)))
        waiting_entries.insert(target_idx, entry)

        for pos, item in enumerate(waiting_entries, start=1):
            item.queue_position = pos

        db.commit()
        QueueService.recalculate_department_queue(db, dept_id)
        db.refresh(entry)
        return entry
