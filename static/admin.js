document.addEventListener("DOMContentLoaded", () => {

    const API = "/api/admin/bookings";

    const totalEl = document.getElementById("totalBookings");
    const pendingEl = document.getElementById("pendingBookings");
    const confirmedEl = document.getElementById("confirmedBookings");
    const deletedEl = document.getElementById("deletedBookings");

    const tableBody = document.getElementById("bookingTableBody");
    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");
    const refreshBtn = document.getElementById("refreshBtn");
    const recordCount = document.getElementById("recordCount");
    const message = document.getElementById("dashboardMessage");

    let bookings = [];

    function showMessage(text) {
        message.textContent = text;
    }

    function updateStats() {

        totalEl.textContent = bookings.length;

        pendingEl.textContent = bookings.filter(
            b => String(b.status).toLowerCase() === "pending"
        ).length;

        confirmedEl.textContent = bookings.filter(
            b => String(b.status).toLowerCase() === "confirmed"
        ).length;

        // Permanent deletions are not stored in the current database.
        deletedEl.textContent = "—";
    }

    function createCell(value) {
        const td = document.createElement("td");
        td.textContent = value ?? "-";
        return td;
    }

    function renderBookings() {

        const search = searchInput.value.toLowerCase().trim();
        const filter = statusFilter.value.toLowerCase();

        const filtered = bookings.filter(booking => {

            const name = String(booking.name || "").toLowerCase();
            const phone = String(booking.phone || "").toLowerCase();
            const event = String(booking.event_type || "").toLowerCase();

            const matchesSearch =
                name.includes(search) ||
                phone.includes(search) ||
                event.includes(search);

            const matchesStatus =
                filter === "all" ||
                String(booking.status).toLowerCase() === filter;

            return matchesSearch && matchesStatus;
        });

        tableBody.replaceChildren();

        recordCount.textContent = `${filtered.length} Records`;

        if (!filtered.length) {
            const row = document.createElement("tr");
            const cell = createCell("No bookings found.");
            cell.colSpan = 8;
            cell.className = "empty-message";
            row.appendChild(cell);
            tableBody.appendChild(row);
            return;
        }

        filtered.forEach(booking => {

            const row = document.createElement("tr");

            row.appendChild(createCell(booking.id));
            row.appendChild(createCell(booking.name));
            row.appendChild(createCell(booking.phone));
            row.appendChild(createCell(booking.event_type));
            row.appendChild(createCell(booking.event_date));
            row.appendChild(createCell(booking.guests));

            const statusCell = document.createElement("td");
            const badge = document.createElement("span");

            const currentStatus =
                String(booking.status || "Pending").toLowerCase();

            badge.className = `status ${currentStatus}`;
            badge.textContent = currentStatus;

            statusCell.appendChild(badge);
            row.appendChild(statusCell);

            const actionCell = document.createElement("td");
            const select = document.createElement("select");

            select.className = "status-select";

            ["Pending", "Confirmed", "Completed"].forEach(status => {

                const option = document.createElement("option");

                option.value = status;
                option.textContent = status;

                option.selected =
                    status.toLowerCase() === currentStatus;

                select.appendChild(option);
            });

            select.addEventListener("change", async () => {

                select.disabled = true;

                try {

                    const response = await fetch(
                        `${API}/${booking.id}/status`,
                        {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                status: select.value
                            })
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.message);
                    }

                    showMessage("Booking status updated successfully.");

                    await loadBookings();

                } catch (error) {

                    showMessage(error.message || "Status update failed.");

                    select.value = booking.status;

                } finally {
                    select.disabled = false;
                }
            });

            actionCell.appendChild(select);
            row.appendChild(actionCell);

            tableBody.appendChild(row);
        });
    }

    async function loadBookings() {

        refreshBtn.disabled = true;
        refreshBtn.textContent = "Loading...";

        try {

            const response = await fetch(API, {
                method: "GET",
                cache: "no-store"
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Unable to load bookings.");
            }

            bookings = Array.isArray(result.bookings)
                ? result.bookings
                : [];

            updateStats();
            renderBookings();

            showMessage("Bookings loaded successfully.");

        } catch (error) {

            showMessage(error.message || "Unable to load bookings.");

        } finally {

            refreshBtn.disabled = false;
            refreshBtn.textContent = "↻ Refresh";
        }
    }

    refreshBtn.addEventListener("click", loadBookings);

    searchInput.addEventListener("input", renderBookings);

    statusFilter.addEventListener("change", renderBookings);

    loadBookings();

});
