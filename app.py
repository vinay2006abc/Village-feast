import os
from functools import wraps
from datetime import datetime, timezone

from flask import (
    Flask, render_template, request,
    redirect, url_for, session, jsonify
)
import turso_serverless

app = Flask(__name__)

app.secret_key = os.environ["SECRET_KEY"]

DATABASE_URL = os.environ["TURSO_DATABASE_URL"]
AUTH_TOKEN = os.environ["TURSO_AUTH_TOKEN"]


def get_db():
    return turso_serverless.connect(
        DATABASE_URL,
        auth_token=AUTH_TOKEN
    )


def init_db():
    db = get_db()

    db.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            event_type TEXT,
            event_date TEXT,
            guests TEXT,
            location TEXT,
            requirements TEXT,
            status TEXT DEFAULT 'Pending',
            created_at TEXT
        )
    """)

    db.commit()
    db.close()


def get_rows(cursor):
    columns = [column[0] for column in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]


def login_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("admin_login"))
        return function(*args, **kwargs)
    return wrapper


@app.route("/")
def home():
    return render_template("index.html")


# Save customer booking
@app.route("/api/bookings", methods=["POST"])
def create_booking():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    phone = str(data.get("phone", "")).strip()

    if not name or not phone:
        return jsonify({
            "success": False,
            "message": "Name and phone are required"
        }), 400

    db = get_db()

    db.execute("""
        INSERT INTO bookings (
            name, phone, event_type, event_date,
            guests, location, requirements,
            status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        name,
        phone,
        str(data.get("eventType", "")).strip(),
        str(data.get("eventDate", "")).strip(),
        str(data.get("guests", "")).strip(),
        str(data.get("location", "")).strip(),
        str(data.get("requirements", "")).strip(),
        "Pending",
        datetime.now(timezone.utc).isoformat()
    ))

    db.commit()
    db.close()

    return jsonify({
        "success": True,
        "message": "Booking saved successfully"
    })


# Admin login
@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        password = request.form.get("password", "")
        admin_password = os.environ.get("ADMIN_PASSWORD", "")

        if admin_password and password == admin_password:
            session["admin_logged_in"] = True
            return redirect(url_for("admin_orders"))

        return render_template(
            "admin_login.html",
            error="Incorrect password"
        )

    return render_template("admin_login.html")


# Admin dashboard
@app.route("/admin/orders")
@login_required
def admin_orders():
    db = get_db()

    cursor = db.execute("""
        SELECT * FROM bookings
        ORDER BY id DESC
    """)

    orders = get_rows(cursor)
    db.close()

    return render_template(
        "orders.html",
        orders=orders,
        bookings=orders
    )


# Individual booking details
@app.route("/admin/order/<int:order_id>")
@login_required
def order_details(order_id):
    db = get_db()

    cursor = db.execute(
        "SELECT * FROM bookings WHERE id = ?",
        (order_id,)
    )

    rows = get_rows(cursor)
    db.close()

    if not rows:
        return "Booking not found", 404

    return render_template(
        "order_details.html",
        order=rows[0],
        booking=rows[0]
    )


# Update booking status
@app.route(
    "/admin/order/<int:order_id>/status",
    methods=["POST"]
)
@login_required
def update_status(order_id):
    status = request.form.get("status", "")

    allowed_statuses = [
        "Pending",
        "Confirmed",
        "Completed"
    ]

    if status not in allowed_statuses:
        return "Invalid status", 400

    db = get_db()

    db.execute("""
        UPDATE bookings
        SET status = ?
        WHERE id = ?
    """, (status, order_id))

    db.commit()
    db.close()

    return redirect(
        url_for("order_details", order_id=order_id)
    )


# Admin logout
@app.route("/admin/logout")
@login_required
def admin_logout():
    session.clear()
    return redirect(url_for("admin_login"))


# Create database table when application starts
init_db()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
