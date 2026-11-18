document.addEventListener("DOMContentLoaded", () => {

    const bookingTable = document.getElementById("bookingTable");

    const totalBookings = document.getElementById("totalBookings");
    const pendingBookings = document.getElementById("pendingBookings");
    const confirmedBookings = document.getElementById("confirmedBookings");
    const completedBookings = document.getElementById("completedBookings");

    const logoutBtn = document.getElementById("logoutBtn");

    // Safely create table cells
    function createCell(value) {
        const td = document.createElement("td");
        td.textContent = value ?? "";
        return td;
    }

    // Load bookings from Neon database
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
                credentials: "same-origin"
            });

            if (response.status === 401) {
                window.location.href = "/admin/login";
                return;
            }

            if (!response.ok) {
                throw new Error("Unable to fetch bookings.");
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || "Failed to load bookings.");
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

            bookings.forEach(booking => {

                const row = document.createElement("tr");

                row.appendChild(createCell(booking.id));
                row.appendChild(createCell(booking.name));
                row.appendChild(createCell(booking.phone));
                row.appendChild(createCell(booking.event_type));
                row.appendChild(createCell(booking.event_date));
                row.appendChild(createCell(booking.guests));
                row.appendChild(createCell(booking.address));

                // Booking status dropdown
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

                    await updateBookingStatus(
                        booking.id,
                        statusSelect.value
                    );

                });

                statusCell.appendChild(statusSelect);
                row.appendChild(statusCell);

                // Refresh action
                const actionCell = document.createElement("td");

                const refreshButton = document.createElement("button");

                refreshButton.textContent = "Refresh";

                refreshButton.addEventListener("click", loadBookings);

                actionCell.appendChild(refreshButton);

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


    // Update dashboard statistics
    function updateStatistics(bookings) {

        totalBookings.textContent = bookings.length;

        pendingBookings.textContent = bookings.filter(
            booking => booking.status === "Pending"
        ).length;

        confirmedBookings.textContent = bookings.filter(
            booking => booking.status === "Confirmed"
        ).length;

        completedBookings.textContent = bookings.filter(
            booking => booking.status === "Completed"
        ).length;

    }


    // Update booking status in Neon
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

            alert("Unable to update booking status. Please try again.");

            await loadBookings();

        }

    }


    // Admin logout
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

            alert("Unable to logout. Please try again.");

        }

    });


    // Load bookings when dashboard opens
    loadBookings();

});
