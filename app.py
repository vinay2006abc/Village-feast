from flask import Flask, render_template, request, jsonify
from database import create_tables, get_db_connection

app = Flask(__name__)

# Create database and bookings table
create_tables()


# Homepage
@app.route("/")
def home():
    return render_template("index.html")


# Customer booking API
@app.route("/api/bookings", methods=["POST"])
def save_booking():
    conn = None

    try:
        data = request.get_json(silent=True) or {}

        name = str(data.get("name", "")).strip()
        phone = str(data.get("phone", "")).strip()
        event_type = str(data.get("eventType", "")).strip()
        event_date = str(data.get("eventDate", "")).strip()
        guests = data.get("guests")
        address = str(data.get("address", "")).strip()
        requirements = str(data.get("requirements", "")).strip()

        # Validate required details
        if not all([name, phone, event_type, event_date, guests, address]):
            return jsonify({
                "success": False,
                "message": "Please provide all required booking details."
            }), 400

        if not phone.isdigit() or len(phone) != 10:
            return jsonify({
                "success": False,
                "message": "Enter a valid 10-digit mobile number."
            }), 400

        try:
            guests = int(guests)
            if guests <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "message": "Enter a valid number of guests."
            }), 400

        # Save booking in SQLite
        conn = get_db_connection()

        cursor = conn.execute("""
            INSERT INTO bookings
            (name, phone, event_type, event_date, guests,
             address, requirements, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            name,
            phone,
            event_type,
            event_date,
            guests,
            address,
            requirements,
            "Pending"
        ))

        booking_id = cursor.lastrowid

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Booking saved successfully.",
            "booking_id": booking_id
        }), 201

    except Exception as e:
        app.logger.exception("Booking save failed: %s", str(e))

        if conn:
            conn.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to save booking."
        }), 500

    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
