document.addEventListener("DOMContentLoaded", () => {

    const bookingTable = document.getElementById("bookingTable");

    const totalBookings = document.getElementById("totalBookings");
    const pendingBookings = document.getElementById("pendingBookings");
    const confirmedBookings = document.getElementById("confirmedBookings");
    const completedBookings = document.getElementById("completedBookings");

    const logoutBtn = document.getElementById("logoutBtn");

    // Create safe table cells
    function createCell(value) {
        const td = document.createElement("td");
        td.textContent = value ?? "";
        return td;
    }


    // Load all bookings
    async function loadBookings() {

        bookingTable.innerHTML = "";

        const loadingRow = document.createElement("tr");
        const loadingCell = createCell("Loading bookings...");
        loadingCell.colSpan = 9;

        loadingRow.appendChild(loadingCell);
        bookingTable.appendChild(loadingRow);

        try {

            const response = await fetch("/api/admin/bookings", {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store"
            });

            if (response.status === 401) {
                window.location.href = "/admin/login";
                return;
            }

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Unable to load bookings.");
            }

            const bookings = result.bookings || [];

            updateStatistics(bookings);

            bookingTable.innerHTML = "";

            if (bookings.length === 0) {

                const row = document.createElement("tr");
                const cell = createCell("No bookings available yet.");

                cell.colSpan = 9;

                row.appendChild(cell);
                bookingTable.appendChild(row);

                return;
            }


            // Display each booking
            bookings.forEach(booking => {

                const row = document.createElement("tr");

                row.appendChild(createCell(booking.id));
                row.appendChild(createCell(booking.name));
                row.appendChild(createCell(booking.phone));
                row.appendChild(createCell(booking.event_type));
                row.appendChild(createCell(booking.event_date));
                row.appendChild(createCell(booking.guests));
                row.appendChild(createCell(booking.address));


                // Status dropdown
                const statusCell = document.createElement("td");

                const statusSelect = document.createElement("select");

                ["Pending", "Confirmed", "Completed"].forEach(status => {

                    const option = document.createElement("option");

                    option.value = status;
                    option.textContent = status;

                    if (booking.status === status) {
                        option.selected = true;
                    }

                    statusSelect.appendChild(option);

                });

                statusSelect.addEventListener("change", async () => {

                    statusSelect.disabled = true;

                    await updateBookingStatus(
                        booking.id,
                        statusSelect.value
                    );

                });

                statusCell.appendChild(statusSelect);
                row.appendChild(statusCell);


                // Actions column
                const actionCell = document.createElement("td");


                // Refresh button
                const refreshButton = document.createElement("button");

                refreshButton.textContent = "Refresh";

                refreshButton.addEventListener("click", loadBookings);

                actionCell.appendChild(refreshButton);


                // DELETE BUTTON FOR COMPLETED BOOKINGS ONLY
                if (
                    String(booking.status).trim().toLowerCase() === "completed"
                ) {

                    const deleteButton = document.createElement("button");

                    deleteButton.textContent = "Delete";

                    deleteButton.style.backgroundColor = "#dc3545";
                    deleteButton.style.color = "white";
                    deleteButton.style.border = "none";
                    deleteButton.style.padding = "8px 14px";
                    deleteButton.style.marginLeft = "8px";
                    deleteButton.style.borderRadius = "5px";
                    deleteButton.style.cursor = "pointer";

                    deleteButton.addEventListener("click", async () => {

                        await deleteBooking(booking.id, deleteButton);

                    });

                    actionCell.appendChild(deleteButton);

                }


                row.appendChild(actionCell);

                bookingTable.appendChild(row);

            });

        } catch (error) {

            console.error("Dashboard error:", error);

            bookingTable.innerHTML = "";

            const row = document.createElement("tr");
            const cell = createCell("Unable to load bookings. Please refresh.");

            cell.colSpan = 9;

            row.appendChild(cell);
            bookingTable.appendChild(row);

        }

    }


    // Update statistics
    function updateStatistics(bookings) {

        totalBookings.textContent = bookings.length;

        pendingBookings.textContent = bookings.filter(
            b => b.status === "Pending"
        ).length;

        confirmedBookings.textContent = bookings.filter(
            b => b.status === "Confirmed"
        ).length;

        completedBookings.textContent = bookings.filter(
            b => b.status === "Completed"
        ).length;

    }


    // Update booking status
    async function updateBookingStatus(bookingId, newStatus) {

        try {

            const response = await fetch(
                `/api/admin/bookings/${encodeURIComponent(bookingId)}/status`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    credentials: "same-origin",

                    body: JSON.stringify({
                        status: newStatus
                    })
                }
            );

            if (response.status === 401) {
                window.location.href = "/admin/login";
                return;
            }

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Status update failed.");
            }

            alert("Booking status updated successfully!");

            await loadBookings();

        } catch (error) {

            console.error("Status update error:", error);

            alert(error.message || "Unable to update status.");

            await loadBookings();

        }

    }


    // Delete completed booking
    async function deleteBooking(bookingId, deleteButton) {

        const confirmation = confirm(
            "Are you sure you want to permanently delete this completed booking?"
        );

        if (!confirmation) {
            return;
        }

        try {

            deleteButton.disabled = true;
            deleteButton.textContent = "Deleting...";

            const response = await fetch(
                `/api/admin/bookings/${encodeURIComponent(bookingId)}`,
                {
                    method: "DELETE",
                    credentials: "same-origin"
                }
            );

            if (response.status === 401) {
                window.location.href = "/admin/login";
                return;
            }

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Delete failed.");
            }

            alert("Completed booking deleted successfully!");

            await loadBookings();

        } catch (error) {

            console.error("Delete error:", error);

            alert(error.message || "Unable to delete booking.");

            await loadBookings();

        }

    }


    // Admin logout
    if (logoutBtn) {

        logoutBtn.addEventListener("click", async () => {

            try {

                const response = await fetch("/admin/logout", {
                    method: "POST",
                    credentials: "same-origin"
                });

                if (!response.ok) {
                    throw new Error("Logout failed.");
                }

                window.location.href = "/admin/login";

            } catch (error) {

                console.error("Logout error:", error);

                alert("Unable to logout.");

            }

        });

    }


    // Start dashboard
    loadBookings();

});
