import os
import secrets
from functools import wraps

from flask import (
    Flask,
    render_template,
    render_template_string,
    request,
    jsonify,
    redirect,
    url_for,
    session
)

from database import create_tables, get_db_connection


app = Flask(__name__)

# Session security
app.secret_key = os.environ.get("SECRET_KEY")

if not app.secret_key:
    raise RuntimeError("SECRET_KEY environment variable is missing.")

app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = (
    os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
)
app.config["PERMANENT_SESSION_LIFETIME"] = 1800

# Admin credentials from Environment Variables
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

if not ADMIN_USERNAME or not ADMIN_PASSWORD:
    raise RuntimeError("Admin credentials are not configured.")

# Initialize database
create_tables()


# Admin authentication
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


# Customer homepage
@app.route("/")
def home():
    return render_template("index.html")


# Customer booking submission
@app.route("/api/bookings", methods=["POST"])
def save_booking():

    conn = None

    try:
        data = request.get_json(silent=True) or {}

        name = str(data.get("name", "")).strip()
        phone = str(data.get("phone", "")).strip()
        event_type = str(data.get("eventType", "")).strip()
        event_date = str(data.get("eventDate", "")).strip()
        address = str(data.get("address", "")).strip()
        requirements = str(data.get("requirements", "")).strip()

        if not all([
            name, phone, event_type, event_date, address
        ]) or data.get("guests") in (None, ""):

            return jsonify({
                "success": False,
                "message": "Please fill in all required details."
            }), 400

        if not phone.isdigit() or len(phone) != 10:
            return jsonify({
                "success": False,
                "message": "Enter a valid 10-digit mobile number."
            }), 400

        try:
            guests = int(data.get("guests"))
            if guests <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "message": "Enter a valid number of guests."
            }), 400

        conn = get_db_connection()

        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO bookings
                (
                    name, phone, event_type, event_date,
                    guests, address, requirements, status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                name, phone, event_type, event_date,
                guests, address, requirements, "Pending"
            ))

            booking_id = cur.fetchone()["id"]

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Booking saved successfully.",
            "booking_id": booking_id
        }), 201

    except Exception:
        app.logger.exception("Booking save failed")

        if conn:
            conn.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to save booking."
        }), 500

    finally:
        if conn:
            conn.close()


# Admin login
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

        return render_template_string(
            LOGIN_HTML,
            error="Invalid username or password."
        )

    return render_template_string(LOGIN_HTML, error="")


# Login page
LOGIN_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Village Feast Admin Login</title>

    <style>
        body {
            font-family: Arial, sans-serif;
            background: #edf2ee;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
        }

        .login-box {
            background: white;
            padding: 35px;
            width: 85%;
            max-width: 360px;
            border-radius: 12px;
            box-shadow: 0 4px 20px #00000015;
        }

        h2 {
            color: #183d2b;
            text-align: center;
        }

        input {
            width: 100%;
            padding: 13px;
            margin: 10px 0;
            box-sizing: border-box;
            border: 1px solid #ccc;
            border-radius: 6px;
        }

        button {
            width: 100%;
            padding: 13px;
            background: #183d2b;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        }

        .error {
            color: red;
            text-align: center;
        }
    </style>
</head>

<body>

    <div class="login-box">

        <h2>Village Feast</h2>
        <p style="text-align:center;">Admin Login</p>

        {% if error %}
            <p class="error">{{ error }}</p>
        {% endif %}

        <form method="POST">

            <input
                type="text"
                name="username"
                placeholder="Admin Username"
                required
            >

            <input
                type="password"
                name="password"
                placeholder="Admin Password"
                required
            >

            <button type="submit">Login</button>

        </form>

    </div>

</body>
</html>
"""


# Admin dashboard
@app.route("/admin")
@admin_required
def admin_dashboard():
    return render_template("admin.html")


# Get all bookings
@app.route("/api/admin/bookings", methods=["GET"])
@admin_required
def get_admin_bookings():

    conn = None

    try:
        conn = get_db_connection()

        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    id, name, phone, event_type, event_date,
                    guests, address, requirements, status
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


# Update booking status
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


# Delete completed booking only
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
                    SELECT id, status
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


# Admin logout
@app.route("/admin/logout", methods=["POST"])
@admin_required
def admin_logout():

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    })


# Run application
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000
    )
