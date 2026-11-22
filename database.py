import os
import psycopg
from psycopg.rows import dict_row


# Neon PostgreSQL connection
DATABASE_URL = os.environ.get("DATABASE_URL")


def get_db_connection():

    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL environment variable is missing."
        )

    conn = psycopg.connect(
        DATABASE_URL,
        row_factory=dict_row
    )

    return conn


# Create bookings table
def create_tables():

    conn = get_db_connection()

    try:
        with conn.cursor() as cur:

            cur.execute("""
                CREATE TABLE IF NOT EXISTS bookings (
                    id BIGSERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    event_type TEXT,
                    event_date TEXT,
                    guests INTEGER,
                    address TEXT,
                    requirements TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'Pending',
                    customer_token TEXT
                )
            """)

            # Ensure required columns exist
            cur.execute("""
                ALTER TABLE bookings
                ADD COLUMN IF NOT EXISTS requirements TEXT
            """)

            cur.execute("""
                ALTER TABLE bookings
                ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending'
            """)

            # Add customer booking reference
            cur.execute("""
                ALTER TABLE bookings
                ADD COLUMN IF NOT EXISTS customer_token TEXT
            """)

            # Ensure customer tokens are unique
            cur.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS
                idx_bookings_customer_token
                ON bookings(customer_token)
                WHERE customer_token IS NOT NULL
            """)

        conn.commit()

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()
