from datetime import datetime, timedelta

def calculate_refund(policies: list, trip_date: datetime, cancellation_date: datetime, total_amount: float):
    """
    Core business logic engine to calculate refund based on dynamic policies.
    """
    time_difference = trip_date - cancellation_date
    hours_difference = time_difference.total_seconds() / 3600.0
    
    refund_percentage = 0.0
    rationale = "Trip has already started or invalid timeframe"
    
    for p in policies:
        min_h = p.min_hours if p.min_hours is not None else 0
        max_h = p.max_hours if p.max_hours is not None else float('inf')
        
        if min_h <= hours_difference < max_h:
            refund_percentage = p.refund_percentage
            if p.max_hours is None:
                rationale = f"Cancellation is > {min_h//24} days prior to trip_date"
            elif min_h == 0:
                rationale = f"Cancellation is < {max_h} hours prior to trip_date"
            else:
                rationale = f"Cancellation is between {min_h//24} to {max_h//24} days prior to trip_date"
            break

    refund_amount = (total_amount * refund_percentage) / 100.0
    retention_fee = total_amount - refund_amount
    
    return refund_amount, retention_fee, rationale
