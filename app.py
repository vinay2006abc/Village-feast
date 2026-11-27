import os
import secrets
import json
from functools import wraps
from urllib.parse import quote

from flask import (
    Flask, render_template, request, jsonify,
    redirect, url_for, session
)

from database import create_tables, get_db_connection


app = Flask(__name__)

# =====================================
# SECURITY
# =====================================

app.secret_key = os.environ.get("SECRET_KEY")

if not app.secret_key:
    raise RuntimeError("SECRET_KEY is missing.")

app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = (
    os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
)
app.config["PERMANENT_SESSION_LIFETIME"] = 1800


# =====================================
# ADMIN SETTINGS
# =====================================

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

if not ADMIN_USERNAME or not ADMIN_PASSWORD:
    raise RuntimeError("Admin credentials are missing.")


# WhatsApp number: country code + number, digits only
WHATSAPP_NUMBER = os.environ.get("WHATSAPP_NUMBER", "")


# =====================================
# DATABASE INITIALIZATION
# =====================================

create_tables()


def ensure_menu_column():
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            cur.execute("""
                ALTER TABLE bookings
                ADD COLUMN IF NOT EXISTS menu_items TEXT
            """)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


ensure_menu_column()


# =====================================
# ADMIN AUTHENTICATION
# =====================================

def admin_required(func):

    @wraps(func)
    def wrapper(*args, **kwargs):

        if session.get("admin_logged_in") is not True:

            if request.path.startswith("/api/"):
                return jsonify({
                    "success": False,
                    "message": "Admin login required."
                }), 401

            return redirect(url_for("admin_login"))

        return func(*args, **kwargs)

    return wrapper


# =====================================
# HOME PAGE
# =====================================

@app.route("/")
def home():
    return render_template("index.html")


# =====================================
# WHATSAPP MESSAGE
# =====================================

def generate_whatsapp_url(data, booking_id):

    if not WHATSAPP_NUMBER:
        return ""

    menu = ", ".join(data["menuItems"])

    message = f"""
Hello Village Feast!

I would like to book catering services.

Booking ID: {booking_id}

Customer Name: {data["customerName"]}
Mobile Number: {data["customerPhone"]}
Event Type: {data["eventType"]}
Event Date: {data["eventDate"]}
Number of Guests: {data["guests"]}
Event Location: {data["eventLocation"]}

Selected Food Items: {menu}

Additional Requirements:
{data["requirements"]}
"""

    return (
        f"https://wa.me/{WHATSAPP_NUMBER}"
        f"?text={quote(message)}"
    )


# =====================================
# CUSTOMER BOOKING API
# =====================================

@app.route("/api/bookings", methods=["POST"])
def save_booking():

    conn = None

    try:

        data = request.get_json(silent=True) or {}

        # Match existing JavaScript field names
        name = str(data.get("customerName", "")).strip()
        phone = str(data.get("customerPhone", "")).strip()
        event_type = str(data.get("eventType", "")).strip()
        event_date = str(data.get("eventDate", "")).strip()
        address = str(data.get("eventLocation", "")).strip()
        requirements = str(data.get("requirements", "")).strip()

        # Validate required details
        if not all([
            name, phone, event_type,
            event_date, address
        ]) or data.get("guests") in (None, ""):

            return jsonify({
                "ok": False,
                "success": False,
                "error": "Please fill in all required details.",
                "message": "Please fill in all required details."
            }), 400

        if not phone.isdigit() or len(phone) != 10:

            return jsonify({
                "ok": False,
                "success": False,
                "error": "Enter a valid 10-digit mobile number."
            }), 400

        try:
            guests = int(data.get("guests"))

            if guests <= 0:
                raise ValueError()

        except (ValueError, TypeError):

            return jsonify({
                "ok": False,
                "success": False,
                "error": "Enter a valid number of guests."
            }), 400

        # Validate selected food
        menu_items = data.get("menuItems", [])

        if not isinstance(menu_items, list):
            return jsonify({
                "ok": False,
                "success": False,
                "error": "Invalid food selection."
            }), 400

        menu_items = [
            str(item).strip()
            for item in menu_items
            if isinstance(item, str) and item.strip()
        ]

        if not menu_items:
            return jsonify({
                "ok": False,
                "success": False,
                "error": "Please select at least one food item."
            }), 400

        if len(menu_items) > 30 or any(
            len(item) > 100 for item in menu_items
        ):
            return jsonify({
                "ok": False,
                "success": False,
                "error": "Invalid food selection."
            }), 400

        booking_token = secrets.token_urlsafe(32)

        conn = get_db_connection()

        with conn.cursor() as cur:

            cur.execute("""
                INSERT INTO bookings (
                    name,
                    phone,
                    event_type,
                    event_date,
                    guests,
                    address,
                    requirements,
                    menu_items,
                    status,
                    customer_token
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                name,
                phone,
                event_type,
                event_date,
                guests,
                address,
                requirements,
                json.dumps(menu_items),
                "Pending",
                booking_token
            ))

            booking_id = cur.fetchone()["id"]

        conn.commit()

        # Generate WhatsApp URL
        whatsapp_url = generate_whatsapp_url({
            "customerName": name,
            "customerPhone": phone,
            "eventType": event_type,
            "eventDate": event_date,
            "guests": guests,
            "eventLocation": address,
            "requirements": requirements,
            "menuItems": menu_items
        }, booking_id)

        return jsonify({
            "ok": True,
            "success": True,
            "message": "Booking saved successfully.",
            "booking_id": booking_id,
            "booking_token": booking_token,
            "whatsapp_url": whatsapp_url
        }), 201

    except Exception:

        app.logger.exception("Booking save failed")

        if conn:
            conn.rollback()

        return jsonify({
            "ok": False,
            "success": False,
            "error": "Unable to save booking.",
            "message": "Unable to save booking."
        }), 500

    finally:

        if conn:
            conn.close()


# =====================================
# CUSTOMER BOOKING STATUS
# =====================================

@app.route("/api/customer-booking-status", methods=["POST"])
def customer_booking_status():

    conn = None

    try:

        data = request.get_json(silent=True) or {}
        token = str(data.get("booking_token", "")).strip()

        if not token or len(token) > 100:
            return jsonify({
                "success": False,
                "message": "Invalid booking reference."
            }), 400

        conn = get_db_connection()

        with conn.cursor() as cur:

            cur.execute("""
                SELECT status
                FROM bookings
                WHERE customer_token = %s
            """, (token,))

            booking = cur.fetchone()

        if not booking:
            return jsonify({
                "success": False,
                "message": "Booking not found."
            }), 404

        return jsonify({
            "success": True,
            "status": booking["status"]
        })

    except Exception:

        app.logger.exception("Booking status check failed")

        return jsonify({
            "success": False,
            "message": "Unable to check booking status."
        }), 500

    finally:

        if conn:
            conn.close()


# =====================================
# ADMIN LOGIN
# =====================================

@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():

    if session.get("admin_logged_in") is True:
        return redirect(url_for("admin_dashboard"))

    if request.method == "POST":

        username = request.form.get("username", "")
        password = request.form.get("password", "")

        if (
            secrets.compare_digest(username, ADMIN_USERNAME)
            and secrets.compare_digest(password, ADMIN_PASSWORD)
        ):

            session.clear()
            session["admin_logged_in"] = True
            session.permanent = True

            return redirect(url_for("admin_dashboard"))

        return render_template(
            "login.html",
            error="Invalid username or password."
        )

    return render_template("login.html", error="")


# =====================================
# ADMIN DASHBOARD
# =====================================

@app.route("/admin")
@admin_required
def admin_dashboard():
    return render_template("admin.html")


# =====================================
# GET ALL BOOKINGS
# =====================================

@app.route("/api/admin/bookings", methods=["GET"])
@admin_required
def get_admin_bookings():

    conn = None

    try:

        conn = get_db_connection()

        with conn.cursor() as cur:

            cur.execute("""
                SELECT
                    id,
                    name,
                    phone,
                    event_type,
                    event_date,
                    guests,
                    address,
                    requirements,
                    menu_items,
                    status,
                    created_at
                FROM bookings
                ORDER BY id DESC
            """)

            bookings = cur.fetchall()

        return jsonify({
            "success": True,
            "bookings": bookings
        })

    except Exception:

        app.logger.exception("Fetching bookings failed")

        return jsonify({
            "success": False,
            "message": "Unable to load bookings."
        }), 500

    finally:

        if conn:
            conn.close()


# =====================================
# UPDATE BOOKING STATUS
# =====================================

@app.route(
    "/api/admin/bookings/<int:booking_id>/status",
    methods=["PATCH"]
)
@admin_required
def update_booking_status(booking_id):

    conn = None

    try:

        data = request.get_json(silent=True) or {}
        status = str(data.get("status", "")).strip()

        if status not in ["Pending", "Confirmed", "Completed"]:
            return jsonify({
                "success": False,
                "message": "Invalid booking status."
            }), 400

        conn = get_db_connection()

        with conn.cursor() as cur:

            cur.execute("""
                UPDATE bookings
                SET status = %s
                WHERE id = %s
            """, (status, booking_id))

            if cur.rowcount == 0:
                conn.rollback()
                return jsonify({
                    "success": False,
                    "message": "Booking not found."
                }), 404

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Booking status updated successfully."
        })

    except Exception:

        app.logger.exception("Status update failed")

        if conn:
            conn.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to update booking status."
        }), 500

    finally:

        if conn:
            conn.close()


# =====================================
# DELETE COMPLETED BOOKINGS ONLY
# =====================================

@app.route(
    "/api/admin/bookings/<int:booking_id>",
    methods=["DELETE"]
)
@admin_required
def delete_completed_booking(booking_id):

    conn = None

    try:

        conn = get_db_connection()

        with conn.cursor() as cur:

            cur.execute("""
                DELETE FROM bookings
                WHERE id = %s
                AND status = %s
                RETURNING id
            """, (booking_id, "Completed"))

            deleted = cur.fetchone()

            if not deleted:

                cur.execute("""
                    SELECT id
                    FROM bookings
                    WHERE id = %s
                """, (booking_id,))

                existing = cur.fetchone()
                conn.rollback()

                if not existing:
                    return jsonify({
                        "success": False,
                        "message": "Booking not found."
                    }), 404

                return jsonify({
                    "success": False,
                    "message": "Only completed bookings can be deleted."
                }), 403

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Completed booking deleted successfully."
        })

    except Exception:

        app.logger.exception("Booking deletion failed")

        if conn:
            conn.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to delete booking."
        }), 500

    finally:

        if conn:
            conn.close()


# =====================================
# ADMIN LOGOUT
# =====================================

@app.route("/admin/logout")
@admin_required
def admin_logout():

    session.clear()

    return redirect(url_for("admin_login"))


# =====================================
# RUN APPLICATION
# =====================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )
