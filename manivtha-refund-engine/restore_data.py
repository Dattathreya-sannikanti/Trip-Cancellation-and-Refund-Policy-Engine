import sqlite3

def restore_data():
    backup_conn = sqlite3.connect("refunds_backup.db")
    backup_conn.row_factory = sqlite3.Row
    backup_cur = backup_conn.cursor()

    main_conn = sqlite3.connect("backend/refunds.db")
    main_cur = main_conn.cursor()

    # Orders
    backup_cur.execute("SELECT booking_id, customer_name, destination, trip_date, total_amount, status FROM orders")
    orders = backup_cur.fetchall()
    for row in orders:
        try:
            main_cur.execute("INSERT OR REPLACE INTO orders (booking_id, customer_name, destination, trip_date, total_amount, status) VALUES (?, ?, ?, ?, ?, ?)", 
                (row["booking_id"], row["customer_name"], row["destination"], row["trip_date"], row["total_amount"], row["status"]))
        except sqlite3.Error as e:
            print(f"Error inserting order: {e}")

    # Policies
    backup_cur.execute("SELECT policy_id, name, min_hours, max_hours, refund_percentage FROM trip_cancellation_refund_policy")
    policies = backup_cur.fetchall()
    for row in policies:
        try:
            main_cur.execute("INSERT OR REPLACE INTO trip_cancellation_refund_policy (policy_id, name, min_hours, max_hours, refund_percentage) VALUES (?, ?, ?, ?, ?)", 
                (row["policy_id"], row["name"], row["min_hours"], row["max_hours"], row["refund_percentage"]))
        except sqlite3.Error as e:
            print(f"Error inserting policy: {e}")

    # Audit Logs
    try:
        backup_cur.execute("SELECT log_id, booking_id, cancellation_date, refund_amount, retention_fee, policy_applied, refund_status FROM audit_logs")
        logs = backup_cur.fetchall()
        for row in logs:
            try:
                main_cur.execute("INSERT OR REPLACE INTO audit_logs (log_id, booking_id, cancellation_date, refund_amount, retention_fee, policy_applied, refund_status) VALUES (?, ?, ?, ?, ?, ?, ?)", 
                    (row["log_id"], row["booking_id"], row["cancellation_date"], row["refund_amount"], row["retention_fee"], row["policy_applied"], row["refund_status"]))
            except sqlite3.Error as e:
                print(f"Error inserting audit log: {e}")
    except sqlite3.OperationalError:
        pass # In case audit_logs doesn't exist or columns are different in backup

    main_conn.commit()
    main_conn.close()
    backup_conn.close()
    print("Data restored successfully.")

if __name__ == "__main__":
    restore_data()
