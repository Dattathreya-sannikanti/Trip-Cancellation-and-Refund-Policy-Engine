from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from backend.config.db import engine, Base, SessionLocal, get_db
from backend.models import schema
from backend.services.refund_engine import calculate_refund

# Create the database tables
Base.metadata.create_all(bind=engine)

def seed_db():
    db = SessionLocal()
    try:
        # Seed policies if empty
        if db.query(schema.TripCancellationRefundPolicy).count() == 0:
            policies = [
                schema.TripCancellationRefundPolicy(name="Tier 1", min_hours=168, max_hours=None, refund_percentage=90.0),
                schema.TripCancellationRefundPolicy(name="Tier 2", min_hours=48, max_hours=168, refund_percentage=50.0),
                schema.TripCancellationRefundPolicy(name="Tier 3", min_hours=0, max_hours=48, refund_percentage=10.0),
            ]
            db.add_all(policies)
            db.commit()
            print("Seeded cancellation policies.")
        
        # Seed sample orders if empty
        if db.query(schema.Order).count() == 0:
            import random
            first_names = ["John", "Jane", "Michael", "Sarah", "David", "Emily", "James", "Emma", "Robert", "Olivia", "William", "Sophia", "Joseph", "Isabella", "Thomas", "Mia", "Charles", "Charlotte", "Daniel", "Amelia", "Liam", "Noah", "Elijah", "Lucas", "Mason", "Logan", "Alexander", "Ethan", "Jacob", "Henry", "Jackson", "Sebastian", "Aiden", "Matthew", "Samuel", "Carter"]
            last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores"]
            destinations = [
                "Paris, France", "Tokyo, Japan", "London, UK", "New York, USA", 
                "Rome, Italy", "Sydney, Australia", "Dubai, UAE", "Singapore", 
                "Barcelona, Spain", "Amsterdam, Netherlands", "Bali, Indonesia", 
                "Bangkok, Thailand", "Seoul, South Korea", "Istanbul, Turkey", 
                "Cape Town, South Africa", "Rio de Janeiro, Brazil", "Machu Picchu, Peru",
                "Kyoto, Japan", "Prague, Czechia", "Vienna, Austria", "Venice, Italy"
            ]
            now = datetime.now()
            orders = []
            for i in range(60):
                name = f"{random.choice(first_names)} {random.choice(last_names)}"
                orders.append(
                    schema.Order(
                        customer_name=name,
                        destination=random.choice(destinations),
                        trip_date=now + timedelta(days=random.randint(5, 90)),
                        total_amount=float(random.randint(50, 500) * 10),
                        status="Booked"
                    )
                )
            db.add_all(orders)
            db.commit()
            print("Seeded sample orders.")
    except Exception as e:
        print(f"Error seeding DB: {e}")
        db.rollback()
    finally:
        db.close()

seed_db()

app = FastAPI(
    title="Trip Cancellation and Refund Policy Engine API",
    description="Backend API for Manivtha Tours & Travels refund calculations."
)

# CORS configuration to accept requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CancellationRequest(BaseModel):
    booking_id: int
    cancellation_date: datetime

class PolicyUpdateRequest(BaseModel):
    policy_id: int
    name: str
    min_hours: Optional[int] = None
    max_hours: Optional[int] = None
    refund_percentage: float

class AuditLogUpdateRequest(BaseModel):
    refund_amount: float
    retention_fee: float
    policy_applied: str

class StatusUpdateRequest(BaseModel):
    status: str

@app.get("/")
def root():
    return {"message": "Welcome to the Manivtha Tours & Travels Refund Engine API"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "Refund Engine"}

@app.get("/api/policies")
def get_policies(db: Session = Depends(get_db)):
    policies = db.query(schema.TripCancellationRefundPolicy).all()
    return policies

@app.put("/api/policies")
def update_policies(req: List[PolicyUpdateRequest], db: Session = Depends(get_db)):
    for p in req:
        policy = db.query(schema.TripCancellationRefundPolicy).filter(schema.TripCancellationRefundPolicy.policy_id == p.policy_id).first()
        if policy:
            policy.min_hours = p.min_hours
            policy.max_hours = p.max_hours
            policy.refund_percentage = p.refund_percentage
    db.commit()
    return {"success": True}

@app.get("/api/orders")
def get_orders(db: Session = Depends(get_db)):
    return db.query(schema.Order).all()

from typing import cast
from sqlalchemy.orm import joinedload

@app.get("/api/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(schema.AuditLog).options(joinedload(schema.AuditLog.order)).order_by(schema.AuditLog.cancellation_date.desc()).all()
    # Need to return dicts with order data embedded for simple JSON serialization of joined data if needed, but SQLAlchemy models with relations often serialize okay if configured, or we can just map them.
    result = []
    for log in logs:
        log_dict = {c.name: getattr(log, c.name) for c in log.__table__.columns}
        if log.order:
            log_dict["order"] = {c.name: getattr(log.order, c.name) for c in log.order.__table__.columns}
        result.append(log_dict)
    return result

@app.get("/api/audit-logs/{log_id}/details")
def get_audit_log_details(log_id: int, db: Session = Depends(get_db)):
    log = db.query(schema.AuditLog).options(joinedload(schema.AuditLog.order)).filter(schema.AuditLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    
    log_dict = {c.name: getattr(log, c.name) for c in log.__table__.columns}
    if log.order:
        log_dict["order"] = {c.name: getattr(log.order, c.name) for c in log.order.__table__.columns}
    return log_dict

@app.put("/api/audit-logs/{log_id}")
def update_audit_log(log_id: int, req: AuditLogUpdateRequest, db: Session = Depends(get_db)):
    log = db.query(schema.AuditLog).filter(schema.AuditLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    
    log.refund_amount = req.refund_amount
    log.retention_fee = req.retention_fee
    log.policy_applied = req.policy_applied
    db.commit()
    db.refresh(log)
    return {"success": True, "message": "Log updated successfully"}

@app.patch("/api/audit-logs/{log_id}/status")
def update_audit_log_status(log_id: int, req: StatusUpdateRequest, db: Session = Depends(get_db)):
    log = db.query(schema.AuditLog).filter(schema.AuditLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    
    if req.status not in ["Pending", "Processed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    log.refund_status = req.status
    db.commit()
    db.refresh(log)
    return {"success": True, "message": f"Status updated to {req.status}"}

@app.post("/api/cancel-order")
def cancel_order(req: CancellationRequest, db: Session = Depends(get_db)):
    query_result = db.query(schema.Order).filter(schema.Order.booking_id == req.booking_id).first()
    order = cast(schema.Order, query_result) if query_result else None
    
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {req.booking_id} not found")
    
    if order.status == "Cancelled":  # type: ignore
        raise HTTPException(status_code=400, detail="This booking has already been cancelled")
    
    # Normalize datetimes for timezone safety
    order_trip_date = cast(datetime, order.trip_date)
    trip_date = order_trip_date.replace(tzinfo=None) if order_trip_date.tzinfo else order_trip_date
    cancel_date = req.cancellation_date.replace(tzinfo=None) if req.cancellation_date.tzinfo else req.cancellation_date
    
    policies = db.query(schema.TripCancellationRefundPolicy).all()
    refund_amount, retention_fee, rationale = calculate_refund(
        policies=policies,
        trip_date=trip_date,
        cancellation_date=cancel_date,
        total_amount=cast(float, order.total_amount)
    )
    
    # Update status
    order.status = "Cancelled"  # type: ignore
    
    # Create audit log entry
    audit = schema.AuditLog(
        booking_id=order.booking_id,
        cancellation_date=cancel_date,
        refund_amount=refund_amount,
        retention_fee=retention_fee,
        policy_applied=rationale
    )
    
    try:
        db.add(audit)
        db.commit()
        db.refresh(order)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database update failed: {e}")
        
    return {
        "success": True,
        "message": "Booking cancelled successfully",
        "booking_id": order.booking_id,
        "status": order.status,
        "refund_amount": refund_amount,
        "retention_fee": retention_fee,
        "policy_applied": rationale
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)

