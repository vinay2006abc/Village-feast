from flask import Flask, render_template, request, jsonify
from database import create_tables, get_db_connection

app = Flask(__name__)

# Initialize SQLite database
create_tables()


# Homepage
@app.route("/")
def home():
    return render_template("index.html")


# Save customer booking in SQLite
@app.route("/api/bookings", methods=["POST"])
def save_booking():

    try:
        data = request.get_json(silent=True) or {}

        name = str(data.get("name", "")).strip()
        phone = str(data.get("phone", "")).strip()

        event_type = str(
            data.get("eventType", data.get("event_type", ""))
        ).strip()

        event_date = str(
            data.get("eventDate", data.get("event_date", ""))
        ).strip()

        guests = data.get("guests", data.get("numberOfGuests"))

        address = str(data.get("address", "")).strip()

        # Validate required fields
        if not name or not phone:
            return jsonify({
                "success": False,
                "message": "Name and phone number are required."
            }), 400

        # Save booking
        conn = get_db_connection()

        cursor = conn.execute("""
            INSERT INTO bookings
            (name, phone, event_type, event_date, guests, address)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            name,
            phone,
            event_type,
            event_date,
            guests,
            address
        ))

        booking_id = cursor.lastrowid

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Booking saved successfully.",
            "booking_id": booking_id
        }), 201

    except Exception as e:

        app.logger.exception(
            "Booking save failed: %s", str(e)
        )

        return jsonify({
            "success": False,
            "message": "Unable to save booking."
        }), 500


# Run Flask application
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
