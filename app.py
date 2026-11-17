from flask import Flask, render_template, request, redirect, session
import os

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "change-this-before-deployment")

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")

@app.route("/")
def home():
    return render_template("index.html")

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

    return render_template("admin.html")

@app.route("/logout")
def logout():
    session.pop("admin", None)
    return redirect("/login")

if __name__ == "__main__":
    app.run()
