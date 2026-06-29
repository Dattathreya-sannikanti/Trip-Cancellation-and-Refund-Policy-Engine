import os
import secrets
from typing import cast
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import joinedload
from backend.services.auth import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, RoleChecker
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from backend.config.db import engine, Base, SessionLocal, get_db
from backend.models import schema
from backend.services.refund_engine import calculate_refund
from backend.services.email_service import send_password_reset_email

# Create the database tables
Base.metadata.create_all(bind=engine)


def seed_db():
    db = SessionLocal()
    try:
        # Seed default admin if users empty
        if db.query(schema.User).count() == 0:
            from backend.services.auth import get_password_hash
            default_admin = schema.User(
                name="Admin User",
                email="admin@manivtha.com",
                password_hash=get_password_hash("password"),
                role=schema.Role.ADMIN
            )
            db.add(default_admin)
            db.commit()
            print("Seeded default admin user.")

        # Seed policies if empty
        if db.query(schema.TripCancellationRefundPolicy).count() == 0:
            policies = [
                schema.TripCancellationRefundPolicy(
                    name="Tier 1",
                    min_hours=168,
                    max_hours=None,
                    refund_percentage=90.0),
                schema.TripCancellationRefundPolicy(
                    name="Tier 2",
                    min_hours=48,
                    max_hours=168,
                    refund_percentage=50.0),
                schema.TripCancellationRefundPolicy(
                    name="Tier 3",
                    min_hours=0,
                    max_hours=48,
                    refund_percentage=10.0),
            ]
            db.add_all(policies)
            db.commit()
            print("Seeded cancellation policies.")

        # Seed sample orders if empty
        if db.query(schema.Order).count() == 0:
            import random
            first_names = [
                "John",
                "Jane",
                "Michael",
                "Sarah",
                "David",
                "Emily",
                "James",
                "Emma",
                "Robert",
                "Olivia",
                "William",
                "Sophia",
                "Joseph",
                "Isabella",
                "Thomas",
                "Mia",
                "Charles",
                "Charlotte",
                "Daniel",
                "Amelia",
                "Liam",
                "Noah",
                "Elijah",
                "Lucas",
                "Mason",
                "Logan",
                "Alexander",
                "Ethan",
                "Jacob",
                "Henry",
                "Jackson",
                "Sebastian",
                "Aiden",
                "Matthew",
                "Samuel",
                "Carter"]
            last_names = [
                "Smith",
                "Johnson",
                "Williams",
                "Brown",
                "Jones",
                "Garcia",
                "Miller",
                "Davis",
                "Rodriguez",
                "Martinez",
                "Hernandez",
                "Lopez",
                "Gonzalez",
                "Wilson",
                "Anderson",
                "Thomas",
                "Taylor",
                "Moore",
                "Jackson",
                "Martin",
                "Lee",
                "Perez",
                "Thompson",
                "White",
                "Harris",
                "Sanchez",
                "Clark",
                "Ramirez",
                "Lewis",
                "Robinson",
                "Walker",
                "Young",
                "Allen",
                "King",
                "Wright",
                "Scott",
                "Torres",
                "Nguyen",
                "Hill",
                "Flores"]
            destinations = [
                "Paris, France",
                "Tokyo, Japan",
                "London, UK",
                "New York, USA",
                "Rome, Italy",
                "Sydney, Australia",
                "Dubai, UAE",
                "Singapore",
                "Barcelona, Spain",
                "Amsterdam, Netherlands",
                "Bali, Indonesia",
                "Bangkok, Thailand",
                "Seoul, South Korea",
                "Istanbul, Turkey",
                "Cape Town, South Africa",
                "Rio de Janeiro, Brazil",
                "Machu Picchu, Peru",
                "Kyoto, Japan",
                "Prague, Czechia",
                "Vienna, Austria",
                "Venice, Italy"]
            now = datetime.now()
            orders = []
            for i in range(60):
                name = f"{
                    random.choice(first_names)} {
                    random.choice(last_names)}"
                status = "Cancelled" if i < 15 else "Booked"
                order_amount = float(random.randint(50, 500) * 10)
                trip_dt = now + timedelta(days=random.randint(5, 90))
                orders.append(
                    schema.Order(
                        customer_name=name,
                        destination=random.choice(destinations),
                        trip_date=trip_dt,
                        total_amount=order_amount,
                        status=status
                    )
                )
            db.add_all(orders)
            db.commit()
            print("Seeded sample orders.")

        # Seed mock audit logs for cancelled orders if empty
        if db.query(schema.AuditLog).count() == 0:
            cancelled_orders = db.query(
                schema.Order).filter(
                schema.Order.status == "Cancelled").all()
            logs = []
            for order in cancelled_orders:
                cancel_dt = order.trip_date - \
                    timedelta(days=random.randint(2, 30))
                # rough mock calculation
                refund_pct = 50.0
                refund_amt = order.total_amount * (refund_pct / 100)
                logs.append(
                    schema.AuditLog(
                        booking_id=order.booking_id,
                        cancellation_date=cancel_dt,
                        refund_amount=refund_amt,
                        retention_fee=order.total_amount -
                        refund_amt,
                        policy_applied="Tier 2",
                        refund_status="Processed" if random.random() > 0.3 else "Pending"))
            db.add_all(logs)
            db.commit()
            print("Seeded sample audit logs.")
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


class UserCreateRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str


class RoleUpdateRequest(BaseModel):
    role: str


class UserProfileUpdate(BaseModel):
    name: str
    email: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "Refund Engine"}


@app.post("/api/login")
def login(
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: Session = Depends(get_db)):
    user = db.query(
        schema.User).filter(
        schema.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is deactivated")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(
                user.id),
            "role": user.role},
        expires_delta=access_token_expires)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email}


@app.get("/api/me", response_model=UserResponse)
def get_current_user_endpoint(current_user: schema.User = Depends(RoleChecker([schema.Role.ADMIN, schema.Role.MANAGER, schema.Role.STAFF]))):
    return current_user


@app.put("/api/me", response_model=UserResponse)
def update_my_profile(
    req: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: schema.User = Depends(RoleChecker([schema.Role.ADMIN, schema.Role.MANAGER, schema.Role.STAFF]))
):
    if req.email != current_user.email:
        existing_user = db.query(schema.User).filter(schema.User.email == req.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")
    
    current_user.name = req.name
    current_user.email = req.email
    db.commit()
    db.refresh(current_user)
    return current_user


@app.post("/api/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(schema.User).filter(schema.User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="This email address is not registered in our system.")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    reset_entry = schema.PasswordReset(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )
    db.add(reset_entry)
    db.commit()

    origin = request.headers.get("origin", "http://localhost:5173")
    reset_link = f"{origin}/reset-password?token={token}"
    background_tasks.add_task(send_password_reset_email, user.email, reset_link)

    return {"success": True, "message": "If that email is in our system, a reset link has been sent."}

@app.get("/api/debug-email")
def debug_email():
    import smtplib
    from email.mime.text import MIMEText
    try:
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USERNAME", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user)
        to_email = "dattathreya52321@gmail.com"

        msg = MIMEText("Debug Email from Render")
        msg["Subject"] = "Debug Render SMTP"
        msg["From"] = from_email
        msg["To"] = to_email

        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(from_email, to_email, msg.as_string())
        else:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(from_email, to_email, msg.as_string())
        
        return {"status": "success", "message": f"Email sent successfully using port {smtp_port} with user {smtp_user}"}
    except Exception as e:
        import traceback
        return {"status": "error", "message": str(e), "traceback": traceback.format_exc()}


@app.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_entry = db.query(schema.PasswordReset).filter(schema.PasswordReset.token == req.token).first()
    
    if not reset_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    now = datetime.now(timezone.utc)
    expires = reset_entry.expires_at.replace(tzinfo=timezone.utc) if reset_entry.expires_at.tzinfo is None else reset_entry.expires_at
    
    if now > expires:
        db.delete(reset_entry)
        db.commit()
        raise HTTPException(status_code=400, detail="Token has expired. Please request a new one.")
        
    user = db.query(schema.User).filter(schema.User.id == reset_entry.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.password_hash = get_password_hash(req.new_password)
    
    db.delete(reset_entry)
    db.commit()
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role},
        expires_delta=access_token_expires)
    
    return {
        "success": True, 
        "message": "Password updated successfully",
        "access_token": access_token,
        "role": user.role,
        "name": user.name,
        "email": user.email
    }


@app.post("/api/users/create")
def create_user(
    req: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: schema.User = Depends(RoleChecker([schema.Role.ADMIN, schema.Role.MANAGER]))
):
    if req.role not in [
            schema.Role.ADMIN,
            schema.Role.MANAGER,
            schema.Role.STAFF]:
        raise HTTPException(status_code=400, detail="Invalid role")

    existing_user = db.query(
        schema.User).filter(
        schema.User.email == req.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = schema.User(
        name=req.name,
        email=req.email,
        password_hash=get_password_hash(req.password),
        role=req.role,
        created_by_id=current_user.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"success": True, "message": "User created successfully"}


@app.get("/api/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: schema.User = Depends(
        RoleChecker([schema.Role.ADMIN, schema.Role.MANAGER]))):
    users = db.query(schema.User).all()
    return users


@app.patch("/api/users/{user_id}/fire")
def fire_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: schema.User = Depends(RoleChecker([schema.Role.ADMIN, schema.Role.MANAGER]))
):
    target_user = db.query(schema.User).filter(schema.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot fire yourself")
        
    if current_user.role == schema.Role.MANAGER and target_user.role in [schema.Role.ADMIN, schema.Role.MANAGER]:
        raise HTTPException(status_code=403, detail="Managers can only fire staff")
        
    if current_user.role == schema.Role.ADMIN and target_user.role == schema.Role.ADMIN:
        raise HTTPException(status_code=403, detail="Admins cannot fire other Admins")
        
    target_user.is_active = False
    db.commit()
    return {"success": True, "message": f"User {target_user.name} has been fired."}


@app.patch("/api/users/{user_id}/role")
def update_user_role(
    user_id: int,
    req: RoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: schema.User = Depends(RoleChecker([schema.Role.ADMIN]))
):
    if req.role not in [schema.Role.ADMIN, schema.Role.MANAGER, schema.Role.STAFF]:
        raise HTTPException(status_code=400, detail="Invalid role specified")
        
    target_user = db.query(schema.User).filter(schema.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Admins cannot change their own role")
        
    target_user.role = req.role
    db.commit()
    return {"success": True, "message": f"User {target_user.name}'s role updated to {req.role}."}


@app.get("/api/policies")
def get_policies(db: Session = Depends(get_db)):
    policies = db.query(schema.TripCancellationRefundPolicy).all()
    return policies


@app.put("/api/policies")
def update_policies(
        req: List[PolicyUpdateRequest],
        db: Session = Depends(get_db),
        current_user: schema.User = Depends(RoleChecker([schema.Role.ADMIN]))):
    for p in req:
        policy = db.query(schema.TripCancellationRefundPolicy).filter(
            schema.TripCancellationRefundPolicy.policy_id == p.policy_id).first()
        if policy:
            policy.min_hours = p.min_hours
            policy.max_hours = p.max_hours
            policy.refund_percentage = p.refund_percentage
    db.commit()
    return {"success": True}


@app.get("/api/orders")
def get_orders(db: Session = Depends(get_db)):
    return db.query(schema.Order).all()


@app.get("/api/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(
        schema.AuditLog).options(
        joinedload(
            schema.AuditLog.order)).order_by(
                schema.AuditLog.cancellation_date.desc()).all()
    # Need to return dicts with order data embedded for simple JSON
    # serialization of joined data if needed, but SQLAlchemy models with
    # relations often serialize okay if configured, or we can just map them.
    result = []
    for log in logs:
        log_dict = {c.name: getattr(log, c.name)
                    for c in log.__table__.columns}
        if log.order:
            log_dict["order"] = {
                c.name: getattr(
                    log.order,
                    c.name) for c in log.order.__table__.columns}
        result.append(log_dict)
    return result


@app.get("/api/audit-logs/{log_id}/details")
def get_audit_log_details(log_id: int, db: Session = Depends(get_db)):
    log = db.query(
        schema.AuditLog).options(
        joinedload(
            schema.AuditLog.order)).filter(
                schema.AuditLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    log_dict = {c.name: getattr(log, c.name) for c in log.__table__.columns}
    if log.order:
        log_dict["order"] = {
            c.name: getattr(
                log.order,
                c.name) for c in log.order.__table__.columns}
    return log_dict


@app.put("/api/audit-logs/{log_id}")
def update_audit_log(
        log_id: int,
        req: AuditLogUpdateRequest,
        db: Session = Depends(get_db)):
    log = db.query(schema.AuditLog).filter(
        schema.AuditLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    log.refund_amount = req.refund_amount
    log.retention_fee = req.retention_fee
    log.policy_applied = req.policy_applied
    db.commit()
    db.refresh(log)
    return {"success": True, "message": "Log updated successfully"}


@app.patch("/api/audit-logs/{log_id}/status")
def update_audit_log_status(
        log_id: int,
        req: StatusUpdateRequest,
        db: Session = Depends(get_db)):
    log = db.query(schema.AuditLog).filter(
        schema.AuditLog.log_id == log_id).first()
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
    query_result = db.query(schema.Order).filter(
        schema.Order.booking_id == req.booking_id).first()
    order = cast(schema.Order, query_result) if query_result else None

    if not order:
        raise HTTPException(
            status_code=404,
            detail=f"Order with ID {
                req.booking_id} not found")

    if order.status == "Cancelled":  # type: ignore
        raise HTTPException(status_code=400,
                            detail="This booking has already been cancelled")

    # Normalize datetimes for timezone safety
    order_trip_date = cast(datetime, order.trip_date)
    trip_date = order_trip_date.replace(
        tzinfo=None) if order_trip_date.tzinfo else order_trip_date
    cancel_date = req.cancellation_date.replace(
        tzinfo=None) if req.cancellation_date.tzinfo else req.cancellation_date

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
        raise HTTPException(
            status_code=500,
            detail=f"Database update failed: {e}")

    return {
        "success": True,
        "message": "Booking cancelled successfully",
        "booking_id": order.booking_id,
        "status": order.status,
        "refund_amount": refund_amount,
        "retention_fee": retention_fee,
        "policy_applied": rationale
    }


# Mount the static files from the frontend build if they exist
frontend_dist = os.path.join(
    os.path.dirname(
        os.path.dirname(__file__)),
    "frontend",
    "dist")
if os.path.exists(frontend_dist):
    # Mount the assets directory (js, css, images)
    app.mount(
        "/assets",
        StaticFiles(
            directory=os.path.join(
                frontend_dist,
                "assets")),
        name="assets")

    # Catch-all route to serve the React SPA index.html
    @app.get("/{catchall:path}")
    def serve_react_app(catchall: str):
        # Ignore API routes
        if catchall.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
            
        # Serve static files in the root of dist (e.g. favicon.svg, robots.txt)
        file_path = os.path.join(frontend_dist, catchall)
        if catchall and os.path.isfile(file_path):
            return FileResponse(file_path)

        index_path = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_path):
            return FileResponse(
                index_path,
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            )
        raise HTTPException(status_code=404, detail="Frontend build not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
