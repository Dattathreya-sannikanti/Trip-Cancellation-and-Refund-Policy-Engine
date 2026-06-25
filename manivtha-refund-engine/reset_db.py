import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from backend.config.db import engine, Base
from backend.app import seed_db

try:
    print("Dropping tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Seeding database...")
    seed_db()
    print("Database reset successfully.")
except Exception as e:
    print(f"Error resetting database: {e}")
