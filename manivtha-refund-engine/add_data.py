import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from datetime import datetime, timedelta
import random
from backend.config.db import SessionLocal
from backend.models import schema

def seed_more_data():
    db = SessionLocal()
    try:
        now = datetime.now()
        first_names = ["John", "Jane", "Michael", "Sarah", "David", "Emily", "James", "Emma", "Robert", "Olivia", "William", "Sophia", "Joseph", "Isabella", "Thomas", "Mia", "Charles", "Charlotte", "Daniel", "Amelia", "Liam", "Noah", "Elijah", "Lucas", "Mason", "Logan", "Alexander", "Ethan", "Jacob", "Michael", "Daniel", "Henry", "Jackson", "Sebastian", "Aiden", "Matthew", "Samuel", "David", "Joseph", "Carter"]
        last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores"]
        destinations = [
            "Paris, France", "Tokyo, Japan", "London, UK", "New York, USA", 
            "Rome, Italy", "Sydney, Australia", "Dubai, UAE", "Singapore", 
            "Barcelona, Spain", "Amsterdam, Netherlands", "Bali, Indonesia", 
            "Bangkok, Thailand", "Seoul, South Korea", "Istanbul, Turkey", 
            "Cape Town, South Africa", "Rio de Janeiro, Brazil", "Machu Picchu, Peru",
            "Kyoto, Japan", "Prague, Czechia", "Vienna, Austria", "Venice, Italy"
        ]
        
        new_orders = []
        for _ in range(50):
            name = f"{random.choice(first_names)} {random.choice(last_names)}"
            dest = random.choice(destinations)
            # Trip dates ranging from 2 days ago to 90 days in the future
            days_offset = random.randint(-2, 90)
            trip_date = now + timedelta(days=days_offset)
            
            # Base amount between $500 and $5000, in round numbers
            amount = float(random.randint(5, 50) * 100)
            
            new_orders.append(
                schema.Order(
                    customer_name=name,
                    destination=dest,
                    trip_date=trip_date,
                    total_amount=amount,
                    status="Booked"
                )
            )
            
        db.add_all(new_orders)
        db.commit()
        print(f"Successfully added {len(new_orders)} more mock orders.")
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_more_data()
