from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from app.models import (
    User, UserRole, Department, Doctor, DoctorStatus, Patient,
    QueueEntry, QueueStatus, PriorityLevel, AIModelMetric
)
from app.auth import get_password_hash
from app.services.ai_service import ai_service
from app.services.queue_service import generate_lookup_pin

DEMO_PASSWORD = "QueueCare2026!"

DEPARTMENTS_DATA = [
    {
        "name": "Cardiology",
        "code": "CARD",
        "avg_consultation_time": 20.0,
        "icon": "Heart",
        "color": "#E11D48",
        "description": "Comprehensive cardiac diagnostic, consultation & heart health management.",
        "total_rooms": 4
    },
    {
        "name": "Pediatrics",
        "code": "PED",
        "avg_consultation_time": 14.0,
        "icon": "Baby",
        "color": "#0284C7",
        "description": "Infant, child, and adolescent healthcare & immunizations.",
        "total_rooms": 3
    },
    {
        "name": "Orthopedics",
        "code": "ORTH",
        "avg_consultation_time": 18.0,
        "icon": "Bone",
        "color": "#D97706",
        "description": "Bone, joint, spine, musculoskeletal diagnosis and treatment.",
        "total_rooms": 3
    },
    {
        "name": "General Medicine",
        "code": "GEN",
        "avg_consultation_time": 12.0,
        "icon": "Stethoscope",
        "color": "#0D9488",
        "description": "Primary outpatient care, health screenings, and general consultations.",
        "total_rooms": 5
    },
    {
        "name": "Emergency & Triage",
        "code": "EMERG",
        "avg_consultation_time": 25.0,
        "icon": "AlertCircle",
        "color": "#DC2626",
        "description": "Urgent medical assessment and stabilization by clinical staff.",
        "total_rooms": 4
    },
    {
        "name": "Ear, Nose & Throat (ENT)",
        "code": "ENT",
        "avg_consultation_time": 15.0,
        "icon": "Ear",
        "color": "#7C3AED",
        "description": "Specialized otolaryngology clinic and audiology services.",
        "total_rooms": 2
    },
]

DOCTORS_DATA = [
    {"email": "dr.sarah@queuecare.ai", "name": "Dr. Sarah Jenkins", "dept_code": "CARD", "room": "Room 101", "avg_time": 18.5},
    {"email": "dr.james@queuecare.ai", "name": "Dr. James Wilson", "dept_code": "PED", "room": "Room 201", "avg_time": 13.0},
    {"email": "dr.elena@queuecare.ai", "name": "Dr. Elena Rostova", "dept_code": "ORTH", "room": "Room 301", "avg_time": 17.0},
    {"email": "dr.marcus@queuecare.ai", "name": "Dr. Marcus Vance", "dept_code": "GEN", "room": "Room 102", "avg_time": 11.5},
    {"email": "dr.aisha@queuecare.ai", "name": "Dr. Aisha Khan", "dept_code": "EMERG", "room": "Triage 1", "avg_time": 22.0},
    {"email": "dr.liam@queuecare.ai", "name": "Dr. Liam Chen", "dept_code": "ENT", "room": "Room 401", "avg_time": 14.0},
    {"email": "dr.priya@queuecare.ai", "name": "Dr. Priya Patel", "dept_code": "CARD", "room": "Room 102", "avg_time": 19.0},
    {"email": "dr.david@queuecare.ai", "name": "Dr. David Kim", "dept_code": "GEN", "room": "Room 103", "avg_time": 12.0},
]

SAMPLE_PATIENTS = [
    {"name": "Eleanor Brooks", "age": 54, "gender": "Female", "phone": "+1 555-0142", "dept": "CARD", "priority": PriorityLevel.ROUTINE, "notes": "Regular quarterly ECG follow-up"},
    {"name": "Liam Gallagher", "age": 7, "gender": "Male", "phone": "+1 555-0189", "dept": "PED", "priority": PriorityLevel.ROUTINE, "notes": "Fever & seasonal allergy consultation"},
    {"name": "Arthur Pendelton", "age": 68, "gender": "Male", "phone": "+1 555-0123", "dept": "ORTH", "priority": PriorityLevel.URGENT_REVIEW, "notes": "Acute knee swelling after fall"},
    {"name": "Clara Oswald", "age": 29, "gender": "Female", "phone": "+1 555-0167", "dept": "GEN", "priority": PriorityLevel.ROUTINE, "notes": "Annual biometric health checkup"},
    {"name": "Mateo Rossi", "age": 42, "gender": "Male", "phone": "+1 555-0198", "dept": "CARD", "priority": PriorityLevel.FOLLOW_UP, "notes": "Blood pressure review & prescription renewal"},
    {"name": "Sophie Turner", "age": 5, "gender": "Female", "phone": "+1 555-0111", "dept": "PED", "priority": PriorityLevel.ROUTINE, "notes": "Pre-school vaccination schedule"},
    {"name": "Devon Hayes", "age": 35, "gender": "Non-Binary", "phone": "+1 555-0133", "dept": "ENT", "priority": PriorityLevel.ROUTINE, "notes": "Sinus congestion & ear pressure"},
    {"name": "Gabriel Santos", "age": 61, "gender": "Male", "phone": "+1 555-0155", "dept": "EMERG", "priority": PriorityLevel.URGENT_REVIEW, "notes": "Severe abdominal pain flagged by intake nurse"},
    {"name": "Hannah Abbott", "age": 23, "gender": "Female", "phone": "+1 555-0177", "dept": "GEN", "priority": PriorityLevel.ROUTINE, "notes": "Persistent migraine consultation"},
    {"name": "Julian Vance", "age": 48, "gender": "Male", "phone": "+1 555-0188", "dept": "ORTH", "priority": PriorityLevel.FOLLOW_UP, "notes": "Post-operative shoulder mobility check"},
    {"name": "Nora Sterling", "age": 31, "gender": "Female", "phone": "+1 555-0199", "dept": "CARD", "priority": PriorityLevel.ROUTINE, "notes": "Palpitation review with Holter report"},
    {"name": "Oliver Twist", "age": 9, "gender": "Male", "phone": "+1 555-0211", "dept": "PED", "priority": PriorityLevel.FOLLOW_UP, "notes": "Asthma inhaler assessment"},
    {"name": "Rachel Zane", "age": 38, "gender": "Female", "phone": "+1 555-0222", "dept": "GEN", "priority": PriorityLevel.ROUTINE, "notes": "Dietary consultation and lab review"},
    {"name": "Vikram Sethi", "age": 52, "gender": "Male", "phone": "+1 555-0233", "dept": "ENT", "priority": PriorityLevel.ROUTINE, "notes": "Throat soreness & hoarseness"},
]

def seed_database(db: Session):
    """
    Seeds database with initial departments, doctors, demo users,
    active queue tickets, and historical consultation records.
    """
    if db.query(User).filter(User.email == "admin@queuecare.ai").first():
        return  # Already seeded

    print("Seeding departments...")
    dept_map = {}
    for d in DEPARTMENTS_DATA:
        dept = Department(
            name=d["name"],
            code=d["code"],
            avg_consultation_time=d["avg_consultation_time"],
            icon=d["icon"],
            color=d["color"],
            description=d["description"],
            total_rooms=d["total_rooms"]
        )
        db.add(dept)
        db.flush()
        dept_map[d["code"]] = dept

    print("Seeding demo admin & staff...")
    admin_user = User(
        email="admin@queuecare.ai",
        hashed_password=get_password_hash(DEMO_PASSWORD),
        full_name="Hospital Administrator",
        role=UserRole.ADMIN,
        is_active=True
    )
    staff_user = User(
        email="staff@queuecare.ai",
        hashed_password=get_password_hash(DEMO_PASSWORD),
        full_name="Front Desk Reception",
        role=UserRole.STAFF,
        is_active=True
    )
    patient_user = User(
        email="patient@queuecare.ai",
        hashed_password=get_password_hash(DEMO_PASSWORD),
        full_name="Jane Doe (Demo Patient)",
        role=UserRole.PATIENT,
        is_active=True
    )
    db.add_all([admin_user, staff_user, patient_user])
    db.flush()

    print("Seeding doctors...")
    doctor_entities = []
    for doc in DOCTORS_DATA:
        u = User(
            email=doc["email"],
            hashed_password=get_password_hash(DEMO_PASSWORD),
            full_name=doc["name"],
            role=UserRole.DOCTOR,
            department_id=dept_map[doc["dept_code"]].id,
            is_active=True
        )
        db.add(u)
        db.flush()

        d_prof = Doctor(
            user_id=u.id,
            department_id=dept_map[doc["dept_code"]].id,
            room_number=doc["room"],
            status=DoctorStatus.AVAILABLE,
            avg_service_time=doc["avg_time"]
        )
        db.add(d_prof)
        db.flush()
        doctor_entities.append(d_prof)

    print("Seeding active patients and queue entries...")
    now = datetime.utcnow()
    dept_queues_count = {d["code"]: 0 for d in DEPARTMENTS_DATA}

    for idx, p_info in enumerate(SAMPLE_PATIENTS):
        dept = dept_map[p_info["dept"]]
        patient = Patient(
            patient_code=f"QC-P-{1000 + idx + 1}",
            full_name=p_info["name"],
            age=p_info["age"],
            gender=p_info["gender"],
            phone=p_info["phone"],
            email=f"{p_info['name'].lower().replace(' ', '.')}@example.com",
            created_at=now - timedelta(minutes=random.randint(10, 180))
        )
        db.add(patient)
        db.flush()

        dept_queues_count[p_info["dept"]] += 1
        pos = dept_queues_count[p_info["dept"]]

        # First in queue in Card & Gen are in consultation or called
        if pos == 1 and p_info["dept"] in ["CARD", "GEN"]:
            status = QueueStatus.IN_CONSULTATION
            doc = next((d for d in doctor_entities if d.department_id == dept.id), None)
            doc_id = doc.id if doc else None
            called_time = now - timedelta(minutes=15)
            started_time = now - timedelta(minutes=12)
            if doc:
                doc.status = DoctorStatus.IN_CONSULTATION
        elif pos == 2 and p_info["dept"] in ["CARD"]:
            status = QueueStatus.CALLED
            doc = next((d for d in doctor_entities if d.department_id == dept.id and d.user_id != 2), None)
            doc_id = doc.id if doc else None
            called_time = now - timedelta(minutes=3)
            started_time = None
        else:
            status = QueueStatus.WAITING
            doc_id = None
            called_time = None
            started_time = None

        pred = ai_service.predict_wait_time(
            department_code=dept.code,
            queue_position=pos,
            active_doctors=2,
            avg_consultation_time=dept.avg_consultation_time,
            priority=p_info["priority"].value
        )

        entry = QueueEntry(
            ticket_number=f"QC-{dept.code}-{100 + pos}",
            patient_id=patient.id,
            department_id=dept.id,
            doctor_id=doc_id,
            priority=p_info["priority"],
            status=status,
            queue_position=pos,
            predicted_wait_minutes=pred["predicted_wait_minutes"] if status == QueueStatus.WAITING else 0.0,
            actual_wait_minutes=12.0 if status == QueueStatus.IN_CONSULTATION else None,
            registered_at=now - timedelta(minutes=45 - (pos * 5)),
            called_at=called_time,
            consultation_started_at=started_time,
            lookup_hash=generate_lookup_pin(),
            notes=p_info["notes"]
        )
        db.add(entry)
        db.flush()

        if status == QueueStatus.IN_CONSULTATION and doc:
            doc.current_ticket_id = entry.id

    print("Seeding past completed consultation records for analytics charts...")
    # Generate 60 completed entries over the past 3 days
    for i in range(60):
        d_code = random.choice(["CARD", "PED", "ORTH", "GEN", "EMERG", "ENT"])
        dept = dept_map[d_code]
        minutes_ago = random.randint(30, 72 * 60)
        reg_time = now - timedelta(minutes=minutes_ago)
        wait_m = random.uniform(8.0, 35.0)
        consult_m = random.uniform(10.0, 28.0)

        p = Patient(
            patient_code=f"QC-P-HIST-{1000 + i}",
            full_name=f"Historical Patient {i+1}",
            age=random.randint(18, 80),
            gender=random.choice(["Male", "Female", "Other"]),
            phone=f"+1 555-9{i:03d}",
            created_at=reg_time
        )
        db.add(p)
        db.flush()

        entry = QueueEntry(
            ticket_number=f"QC-{dept.code}-H{200 + i}",
            patient_id=p.id,
            department_id=dept.id,
            priority=random.choice([PriorityLevel.ROUTINE, PriorityLevel.FOLLOW_UP, PriorityLevel.URGENT_REVIEW]),
            status=QueueStatus.COMPLETED,
            queue_position=0,
            predicted_wait_minutes=round(wait_m + random.uniform(-3, 3), 1),
            actual_wait_minutes=round(wait_m, 1),
            actual_consultation_minutes=round(consult_m, 1),
            registered_at=reg_time,
            called_at=reg_time + timedelta(minutes=wait_m),
            consultation_started_at=reg_time + timedelta(minutes=wait_m),
            completed_at=reg_time + timedelta(minutes=wait_m + consult_m),
            lookup_hash=generate_lookup_pin(),
            notes="Completed clinical visit"
        )
        db.add(entry)

    db.commit()
    print("Database seeding completed successfully.")
