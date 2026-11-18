from flask import Flask, render_template, request, jsonify
from database import create_tables, get_db_connection

app = Flask(__name__)

# Initialize database table
create_tables()


# Homepage
@app.route("/")
def home():
    return render_template("index.html")


# Save customer booking
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

        # Validate required details
        if not all([
            name, phone, event_type,
            event_date, address
        ]) or data.get("guests") in (None, ""):

            return jsonify({
                "success": False,
                "message": "Please fill in all required details."
            }), 400

        # Validate phone number
        if not phone.isdigit() or len(phone) != 10:
            return jsonify({
                "success": False,
                "message": "Enter a valid 10-digit mobile number."
            }), 400

        # Validate guests
        try:
            guests = int(data.get("guests"))

            if guests <= 0:
                raise ValueError()

        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "message": "Enter a valid number of guests."
            }), 400

        # Connect to Neon database
        conn = get_db_connection()

        with conn.cursor() as cur:

            cur.execute("""
                INSERT INTO bookings
                (
                    name,
                    phone,
                    event_type,
                    event_date,
                    guests,
                    address,
                    requirements,
                    status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
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

            booking_id = cur.fetchone()["id"]

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Booking saved successfully.",
            "booking_id": booking_id
        }), 201

    except Exception as e:

        app.logger.exception(
            "Booking save failed: %s", str(e)
        )

        if conn:
            conn.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to save booking."
        }), 500

    finally:
        if conn:
            conn.close()


# Run application
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000
    )
