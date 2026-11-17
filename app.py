@app.route("/admin")
def admin():
    if not session.get("admin"):
        return redirect("/login")

    try:
        result = (
            supabase.table("orders")
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
        return "Unable to load orders. Please try again.", 500
