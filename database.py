import sqlite3

DATABASE = "village_feast.db"


def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def create_tables():
    conn = get_db_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            event_type TEXT,
            event_date TEXT,
            guests INTEGER,
            address TEXT,
            requirements TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'Pending'
        )
    """)

    # Add requirements column if an older table already exists
    columns = [
        row["name"]
        for row in conn.execute(
            "PRAGMA table_info(bookings)"
        ).fetchall()
    ]

    if "requirements" not in columns:
        conn.execute(
            "ALTER TABLE bookings ADD COLUMN requirements TEXT"
        )

    conn.commit()
    conn.close()
