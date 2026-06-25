import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

import random
from typing import cast
from datetime import datetime, timedelta
from backend.config.db import SessionLocal
from backend.models import schema
from backend.services.refund_engine import calculate_refund

def seed_cancellations():
    db = SessionLocal()
    try:
        # Get all currently booked orders
        booked_orders = db.query(schema.Order).filter(schema.Order.status == "Booked").all()
        
        if not booked_orders:
            print("No booked orders found to cancel.")
            return

        # Pick 20 random orders to cancel
        orders_to_cancel = random.sample(booked_orders, min(20, len(booked_orders)))
        
        cancellations_count = 0
        for i, order in enumerate(orders_to_cancel):
            trip_date_casted = cast(datetime, order.trip_date)
            trip_date = trip_date_casted.replace(tzinfo=None) if trip_date_casted.tzinfo else trip_date_casted
            
            # Distribute cancellations evenly across the 3 policy tiers
            if i % 3 == 0:
                # Tier 1: > 7 days prior
                cancel_date = trip_date - timedelta(days=random.randint(8, 20))
            elif i % 3 == 1:
                # Tier 2: 2-7 days prior
                cancel_date = trip_date - timedelta(days=random.randint(3, 6))
            else:
                # Tier 3: < 48 hours prior
                cancel_date = trip_date - timedelta(hours=random.randint(1, 47))

            policies = db.query(schema.TripCancellationRefundPolicy).all()
            refund_amount, retention_fee, rationale = calculate_refund(
                policies=policies,
                trip_date=trip_date,
                cancellation_date=cancel_date,
                total_amount=cast(float, order.total_amount)
            )
            
            order.status = "Cancelled"  # type: ignore
            
            audit = schema.AuditLog(
                booking_id=order.booking_id,
                cancellation_date=cancel_date,
                refund_amount=refund_amount,
                retention_fee=retention_fee,
                policy_applied=rationale,
                refund_status=random.choice(["Pending", "Processed"])
            )
            db.add(audit)
            cancellations_count += 1
            
        db.commit()
        print(f"Successfully processed {cancellations_count} random cancellations to populate audit logs.")
    except Exception as e:
        print(f"Error seeding cancellations: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_cancellations()
