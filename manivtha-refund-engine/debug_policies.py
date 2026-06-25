import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from backend.config.db import SessionLocal
from backend.models import schema

db = SessionLocal()
try:
    policies = db.query(schema.TripCancellationRefundPolicy).all()
    for p in policies:
        print(p.policy_id, p.name, p.min_hours, p.max_hours, p.refund_percentage)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
