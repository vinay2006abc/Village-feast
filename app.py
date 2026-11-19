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
                UPDATE bookings
                SET deleted = TRUE
                WHERE id = %s
                AND status = %s
                AND deleted = FALSE
                RETURNING id
            """, (booking_id, "Completed"))

            deleted_booking = cur.fetchone()

            if not deleted_booking:
                conn.rollback()

                return jsonify({
                    "success": False,
                    "message": "Booking not found or not completed."
                }), 404

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Booking moved to Deleted section."
        })

    except Exception:
        app.logger.exception("Soft deletion failed")

        if conn:
            conn.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to delete booking."
        }), 500

    finally:
        if conn:
            conn.close()
