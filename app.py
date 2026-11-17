from flask import Flask, render_template, request, redirect, session, jsonify
from supabase import create_client
import os

app = Flask(__name__)

# Security settings
app.secret_key = os.environ.get("SECRET_KEY")

# Admin password
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")

# Supabase settings
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SECRET_KEY")
    or os.environ.get("SUPABASE_KEY")
)

# Connect to Supabase
supabase = None

if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_supabase():
    if supabase is None:
        raise RuntimeError("Supabase configuration is missing.")
    return supabase


# Home page
@app.route("/")
def home():
    return render_template("index.html")


# Customer booking API
@app.route("/api/orders", methods=["POST"])
def create_order():
    try:
        data = request.get_json(silent=True) or {}

        name = str(data.get("name", "")).strip()
        phone = str(data.get("phone", "")).strip()
        event_type = str(data.get("eventType", "")).strip()
        event_date = str(data.get("date", "")).strip()
        guests = str(data.get("guests", "")).strip()
        location = str(data.get("location", "")).strip()
        requirements = str(data.get("requirements", "")).strip()

        # Validate required fields
        if not all([
            name,
            phone,
            event_type,
            event_date,
            guests,
            location
        ]):
            return jsonify({
                "success": False,
                "message": "Please fill all required fields."
            }), 400

        if not phone.isdigit() or len(phone) != 10:
            return jsonify({
                "success": False,
                "message": "Invalid mobile number."
            }), 400

        # Prepare database record
        order_data = {
            "customer_name": name,
            "phone": phone,
            "event_type": event_type,
            "event_date": event_date,
            "guests": guests,
            "location": location,
            "requirements": requirements,
            "status": "P"
        }

        # Save booking to Supabase
        result = (
            get_supabase()
            .table("orders")
            .insert(order_data)
            .execute()
        )

        return jsonify({
            "success": True,
            "message": "Booking saved successfully!"
        }), 201

    except Exception as e:
        app.logger.exception(
            "Booking save failed: %s", str(e)
        )

        return jsonify({
            "success": False,
            "message": "Unable to save booking."
        }), 500


# Admin login
@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        password = request.form.get("password", "")

        if ADMIN_PASSWORD and password == ADMIN_PASSWORD:
            session["admin"] = True
            return redirect("/admin")

        return render_template(
            "login.html",
            error="Incorrect password"
        )

    return render_template("login.html")


# Admin dashboard
@app.route("/admin")
def admin():

    if not session.get("admin"):
        return redirect("/login")

    try:
        result = (
            get_supabase()
            .table("orders")
            .select("*")
            .order("id", desc=True)
            .execute()
        )

        orders = result.data or []

        return render_template(
            "admin.html",
            orders=orders,
            total_orders=len(orders)
        )

    except Exception:
        app.logger.exception("Failed to load orders")
        return "Unable to load orders.", 500


# Update booking status
@app.route("/api/orders/<int:order_id>/status", methods=["POST"])
def update_order_status(order_id):

    if not session.get("admin"):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 401

    try:
        data = request.get_json(silent=True) or {}
        status = data.get("status")

        allowed_statuses = [
            "P",
            "Confirmed",
            "Completed",
            "Cancelled"
        ]

        if status not in allowed_statuses:
            return jsonify({
                "success": False,
                "message": "Invalid status."
            }), 400

        get_supabase().table("orders").update({
            "status": status
        }).eq("id", order_id).execute()

        return jsonify({
            "success": True,
            "message": "Status updated."
        })

    except Exception:
        app.logger.exception("Status update failed")

        return jsonify({
            "success": False,
            "message": "Status update failed."
        }), 500


# Admin logout
@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")


# Start Flask
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )
