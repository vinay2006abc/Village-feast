from flask import Flask, render_template, request, redirect, session, jsonify
import os
import sqlite3

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY")

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")

DB_PATH = os.environ.get(
    "DB_PATH",
    os.path.join(app.instance_path, "orders.db")
)

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def create_table():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                event_type TEXT,
                event_date TEXT,
                guests TEXT,
                location TEXT,
                requirements TEXT,
                status TEXT DEFAULT 'Pending'
            )
        """)


create_table()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/orders", methods=["POST"])
def save_order():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Invalid order"}), 400

    required = ["name", "phone", "eventType", "date",
                "guests", "location"]

    if any(not str(data.get(key, "")).strip() for key in required):
        return jsonify({"error": "Please complete all required fields"}), 400

    if not str(data["phone"]).isdigit() or len(data["phone"]) != 10:
        return jsonify({"error": "Invalid phone number"}), 400

    with get_db() as conn:
        conn.execute("""
            INSERT INTO orders
            (name, phone, event_type, event_date, guests,
             location, requirements)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            data["name"],
            data["phone"],
            data["eventType"],
            data["date"],
            data["guests"],
            data["location"],
            data.get("requirements", "")
        ))

    return jsonify({"message": "Order saved successfully"}), 201


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        password = request.form.get("password", "")

        if ADMIN_PASSWORD and password == ADMIN_PASSWORD:
            session["admin"] = True
            return redirect("/admin")

        return "Incorrect password. Please try again."

    return render_template("login.html")


@app.route("/admin")
def admin():
    if not session.get("admin"):
        return redirect("/login")

    with get_db() as conn:
        orders = conn.execute(
            "SELECT * FROM orders ORDER BY id DESC"
        ).fetchall()

    return render_template(
        "admin.html",
        orders=orders,
        total_orders=len(orders)
    )


@app.route("/logout")
def logout():
    session.pop("admin", None)
    return redirect("/login")


if __name__ == "__main__":
    app.run()
