document.addEventListener("DOMContentLoaded", () => {

    const bookingTable = document.getElementById("bookingTableBody");

    const totalBookings = document.getElementById("totalBookings");
    const pendingBookings = document.getElementById("pendingBookings");
    const confirmedBookings = document.getElementById("confirmedBookings");
    const completedBookings = document.getElementById("completedBookings");

    const refreshBtn = document.getElementById("refreshBtn");
    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");
    const recordCount = document.getElementById("recordCount");
    const dashboardMessage = document.getElementById("dashboardMessage");

    let allBookings = [];

    // Safe table cell
    function createCell(value) {
        const td = document.createElement("td");
        td.textContent = value ?? "";
        return td;
    }

    // Show dashboard message
    function showMessage(message, error = false) {
        if (!dashboardMessage) return;

        dashboardMessage.textContent = message;
        dashboardMessage.style.color = error ? "red" : "green";
    }

    // Update statistics
    function updateStatistics(bookings) {

        totalBookings.textContent = bookings.length;

        pendingBookings.textContent = bookings.filter(
            b => String(b.status).toLowerCase() === "pending"
        ).length;

        confirmedBookings.textContent = bookings.filter(
            b => String(b.status).toLowerCase() === "confirmed"
        ).length;

        completedBookings.textContent = bookings.filter(
            b => String(b.status).toLowerCase() === "completed"
        ).length;
    }

    // Filter bookings
    function filterBookings() {

        const search = searchInput.value.toLowerCase().trim();
        const selectedStatus = statusFilter.value.toLowerCase();

        const filtered = allBookings.filter(booking => {

            const matchesSearch = [
                booking.name,
                booking.phone,
                booking.event_type,
                booking.event_date
            ].some(value =>
                String(value ?? "").toLowerCase().includes(search)
            );

            const matchesStatus =
                selectedStatus === "all" ||
                String(booking.status).toLowerCase() === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        displayBookings(filtered);

        if (recordCount) {
            recordCount.textContent = `${filtered.length} Records`;
        }
    }

    // Display bookings
    function displayBookings(bookings) {

        bookingTable.innerHTML = "";

        if (bookings.length === 0) {

            const row = document.createElement("tr");
            const cell = createCell("No bookings available.");

            cell.colSpan = 8;
            cell.className = "empty-message";

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

            // Status column
            const statusCell = document.createElement("td");
            const statusSelect = document.createElement("select");

            ["Pending", "Confirmed", "Completed"].forEach(status => {

                const option = document.createElement("option");

                option.value = status;
                option.textContent = status;

                if (
                    String(booking.status).toLowerCase() ===
                    status.toLowerCase()
                ) {
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

            // Delete only completed bookings
            if (
                String(booking.status).trim().toLowerCase() === "completed"
            ) {

                const deleteButton = document.createElement("button");

                deleteButton.textContent = "Delete";

                deleteButton.style.backgroundColor = "#dc3545";
                deleteButton.style.color = "white";
                deleteButton.style.border = "none";
                deleteButton.style.padding = "8px 14px";
                deleteButton.style.borderRadius = "5px";
                deleteButton.style.cursor = "pointer";

                deleteButton.addEventListener("click", async () => {
                    await deleteBooking(booking.id, deleteButton);
                });

                actionCell.appendChild(deleteButton);

            } else {

                actionCell.textContent = "—";
            }

            row.appendChild(actionCell);

            bookingTable.appendChild(row);
        });
    }

    // Load bookings
    async function loadBookings() {

        bookingTable.innerHTML = "";

        const loadingRow = document.createElement("tr");
        const loadingCell = createCell("Loading bookings...");

        loadingCell.colSpan = 8;

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

            allBookings = result.bookings || [];

            updateStatistics(allBookings);

            filterBookings();

            showMessage("");

        } catch (error) {

            console.error("Loading error:", error);

            bookingTable.innerHTML = "";

            const row = document.createElement("tr");
            const cell = createCell("Unable to load bookings. Please refresh.");

            cell.colSpan = 8;

            row.appendChild(cell);
            bookingTable.appendChild(row);

            showMessage(error.message, true);
        }
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

            showMessage("Booking status updated successfully!");

            await loadBookings();

        } catch (error) {

            console.error("Status update error:", error);

            showMessage(error.message, true);

            await loadBookings();
        }
    }

    // Delete completed booking
    async function deleteBooking(bookingId, button) {

        const confirmation = confirm(
            "Are you sure you want to permanently delete this completed booking?"
        );

        if (!confirmation) return;

        try {

            button.disabled = true;
            button.textContent = "Deleting...";

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

            showMessage("Completed booking deleted successfully!");

            await loadBookings();

        } catch (error) {

            console.error("Delete error:", error);

            showMessage(error.message, true);

            await loadBookings();
        }
    }

    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadBookings);
    }

    // Search
    if (searchInput) {
        searchInput.addEventListener("input", filterBookings);
    }

    // Status filter
    if (statusFilter) {
        statusFilter.addEventListener("change", filterBookings);
    }

    // Start dashboard
    loadBookings();

});
