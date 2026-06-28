import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from backend.config.db import Base
from datetime import datetime, timezone


class Role(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    STAFF = "STAFF"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(Role), default=Role.STAFF, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Integer, default=1)


class Order(Base):
    __tablename__ = "orders"

    booking_id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)
    trip_date = Column(DateTime, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(String(20), default="Booked")  # Booked, Cancelled

    audit_logs = relationship("AuditLog", back_populates="order")


class TripCancellationRefundPolicy(Base):
    __tablename__ = "trip_cancellation_refund_policy"

    policy_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)  # e.g. 'Tier 1'
    min_hours = Column(Integer, nullable=True)  # None means no lower bound
    max_hours = Column(Integer, nullable=True)  # None means no upper bound
    refund_percentage = Column(Float, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(
        Integer,
        ForeignKey("orders.booking_id"),
        nullable=False)
    cancellation_date = Column(
        DateTime,
        default=lambda: datetime.now(
            timezone.utc))
    refund_amount = Column(Float, nullable=False)
    retention_fee = Column(Float, nullable=False)
    policy_applied = Column(String(100), nullable=False)
    refund_status = Column(String(20), default="Pending")  # Pending, Processed

    order = relationship("Order", back_populates="audit_logs")


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")
