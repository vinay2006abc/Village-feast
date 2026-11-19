/* =====================================
   VILLAGE FEAST - ADMIN DASHBOARD JS
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    const API_URL = "/api/admin/dashboard";
    const STATUS_URL = "/api/admin/bookings";

    const totalBookings = document.getElementById("totalBookings");
    const pendingBookings = document.getElementById("pendingBookings");
    const confirmedBookings = document.getElementById("confirmedBookings");
    const deletedBookings = document.getElementById("deletedBookings");

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

    function updateStats(stats = {}) {
        totalBookings.textContent = stats.total ?? 0;
        pendingBookings.textContent = stats.pending ?? 0;
        confirmedBookings.textContent = stats.confirmed ?? 0;
        deletedBookings.textContent = stats.deleted ?? 0;
    }

    function createCell(value) {
        const td = document.createElement("td");
        td.textContent = value ?? "-";
        return td;
    }

    function renderBookings() {

        const search = searchInput.value.toLowerCase().trim();
        const selectedStatus = statusFilter.value;

        const filtered = bookings.filter(booking => {

            const customer = String(booking.customer_name ?? "").toLowerCase();
            const phone = String(booking.phone ?? "").toLowerCase();
            const event = String(booking.event_type ?? "").toLowerCase();

            const matchesSearch =
                customer.includes(search) ||
                phone.includes(search) ||
                event.includes(search);

            const matchesStatus =
                selectedStatus === "all" ||
                String(booking.status).toLowerCase() === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        tableBody.replaceChildren();

        recordCount.textContent = `${filtered.length} Records`;

        if (filtered.length === 0) {
            const row = document.createElement("tr");
            const cell = createCell("No bookings found");
            cell.colSpan = 8;
            cell.className = "empty-message";
            row.appendChild(cell);
            tableBody.appendChild(row);
            return;
        }

        filtered.forEach(booking => {

            const row = document.createElement("tr");

            row.appendChild(createCell(booking.id));
            row.appendChild(createCell(booking.customer_name));
            row.appendChild(createCell(booking.phone));
            row.appendChild(createCell(booking.event_type));
            row.appendChild(createCell(booking.event_date));
            row.appendChild(createCell(booking.guests));

            // Status
            const statusCell = document.createElement("td");
            const statusBadge = document.createElement("span");

            const status = String(booking.status || "pending").toLowerCase();

            statusBadge.className = `status ${status}`;
            statusBadge.textContent = status;

            statusCell.appendChild(statusBadge);
            row.appendChild(statusCell);

            // Status management
            const actionCell = document.createElement("td");
            const select = document.createElement("select");

            select.className = "status-select";

            ["pending", "confirmed", "completed"].forEach(value => {
                const option = document.createElement("option");
                option.value = value;
                option.textContent =
                    value.charAt(0).toUpperCase() + value.slice(1);

                if (status === value) {
                    option.selected = true;
                }

                select.appendChild(option);
            });

            select.addEventListener("change", async () => {

                const newStatus = select.value;
                select.disabled = true;

                try {
                    const response = await fetch(
                        `${STATUS_URL}/${encodeURIComponent(booking.id)}/status`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                status: newStatus
                            })
                        }
                    );

                    if (!response.ok) {
                        throw new Error("Status update failed");
                    }

                    showMessage("Booking status updated successfully.");
                    await loadDashboard();

                } catch (error) {
                    showMessage("Unable to update status. Please try again.");
                    select.value = status;
                } finally {
                    select.disabled = false;
                }
            });

            actionCell.appendChild(select);
            row.appendChild(actionCell);

            tableBody.appendChild(row);
        });
    }

    async function loadDashboard() {

        refreshBtn.disabled = true;
        refreshBtn.textContent = "Loading...";

        showMessage("Loading booking records...");

        try {

            const response = await fetch(API_URL, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error("Dashboard data unavailable");
            }

            const data = await response.json();

            bookings = Array.isArray(data.bookings)
                ? data.bookings
                : [];

            updateStats(data.stats);
            renderBookings();

            showMessage("Booking records loaded successfully.");

        } catch (error) {

            showMessage(
                "Unable to load bookings. Please check the dashboard API."
            );

            tableBody.replaceChildren();

            const row = document.createElement("tr");
            const cell = createCell("Unable to load booking records.");
            cell.colSpan = 8;
            cell.className = "empty-message";

            row.appendChild(cell);
            tableBody.appendChild(row);

        } finally {

            refreshBtn.disabled = false;
            refreshBtn.textContent = "↻ Refresh";
        }
    }

    refreshBtn.addEventListener("click", loadDashboard);

    searchInput.addEventListener("input", renderBookings);

    statusFilter.addEventListener("change", renderBookings);

    loadDashboard();

});
