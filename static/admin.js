document.addEventListener("DOMContentLoaded", () => {

    const bookingTable = document.getElementById("bookingTable");

    const totalBookings = document.getElementById("totalBookings");
    const pendingBookings = document.getElementById("pendingBookings");
    const confirmedBookings = document.getElementById("confirmedBookings");
    const completedBookings = document.getElementById("completedBookings");

    const logoutBtn = document.getElementById("logoutBtn");
    const refreshAnalyticsBtn = document.getElementById("refreshAnalyticsBtn");

    // Store chart instances
    let monthlyChart = null;
    let eventChart = null;
    let guestChart = null;
    let dateChart = null;


    // Create safe table cells
    function createCell(value) {
        const td = document.createElement("td");
        td.textContent = value ?? "";
        return td;
    }


    // Convert database event date into a valid local date
    function parseEventDate(value) {

        if (!value) return null;

        const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

        if (!match) return null;

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

        const date = new Date(year, month - 1, day);

        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return null;
        }

        return date;
    }


    // Update booking statistics
    function updateStatistics(bookings) {

        totalBookings.textContent = bookings.length;

        pendingBookings.textContent = bookings.filter(
            b => String(b.status).trim().toLowerCase() === "pending"
        ).length;

        confirmedBookings.textContent = bookings.filter(
            b => String(b.status).trim().toLowerCase() === "confirmed"
        ).length;

        completedBookings.textContent = bookings.filter(
            b => String(b.status).trim().toLowerCase() === "completed"
        ).length;

    }


    // Dashboard analytics using actual database records
    function updateAnalytics(bookings) {

        if (typeof Chart === "undefined") {
            console.error("Chart.js is not loaded.");
            return;
        }

        const monthlyData = {};
        const eventData = {};
        const guestData = {
            "1–50": 0,
            "51–100": 0,
            "101–200": 0,
            "201–500": 0,
            "501+": 0
        };
        const dateData = {};

        let totalGuests = 0;
        let validGuestBookings = 0;

        bookings.forEach(booking => {

            // Monthly analysis
            const eventDate = parseEventDate(booking.event_date);

            if (eventDate) {

                const year = eventDate.getFullYear();
                const month = String(eventDate.getMonth() + 1).padStart(2, "0");

                const monthKey = `${year}-${month}`;

                monthlyData[monthKey] =
                    (monthlyData[monthKey] || 0) + 1;

                // Date-wise analysis
                const dateKey =
                    `${year}-${month}-${String(eventDate.getDate()).padStart(2, "0")}`;

                dateData[dateKey] =
                    (dateData[dateKey] || 0) + 1;
            }


            // Event type analysis
            const eventType =
                String(booking.event_type || "Other").trim() || "Other";

            eventData[eventType] =
                (eventData[eventType] || 0) + 1;


            // Guest count analysis
            const guests = Number(booking.guests);

            if (Number.isFinite(guests) && guests > 0) {

                totalGuests += guests;
                validGuestBookings++;

                if (guests <= 50) {
                    guestData["1–50"]++;
                } else if (guests <= 100) {
                    guestData["51–100"]++;
                } else if (guests <= 200) {
                    guestData["101–200"]++;
                } else if (guests <= 500) {
                    guestData["201–500"]++;
                } else {
                    guestData["501+"]++;
                }

            }

        });


        // Monthly booking chart
        const monthlyLabels = Object.keys(monthlyData).sort();

        const monthlyValues = monthlyLabels.map(
            key => monthlyData[key]
        );

        const formattedMonths = monthlyLabels.map(key => {

            const [year, month] = key.split("-");

            return new Date(
                Number(year),
                Number(month) - 1,
                1
            ).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric"
            });

        });

        if (monthlyChart) monthlyChart.destroy();

        monthlyChart = new Chart(
            document.getElementById("monthlyChart"),
            {
                type: "bar",
                data: {
                    labels: formattedMonths,
                    datasets: [{
                        label: "Bookings",
                        data: monthlyValues,
                        backgroundColor: "#24764b",
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            }
        );


        // Event type doughnut chart
        if (eventChart) eventChart.destroy();

        eventChart = new Chart(
            document.getElementById("eventChart"),
            {
                type: "doughnut",
                data: {
                    labels: Object.keys(eventData),
                    datasets: [{
                        data: Object.values(eventData),
                        backgroundColor: [
                            "#24764b",
                            "#e6a23c",
                            "#4285f4",
                            "#9b59b6",
                            "#e76f51",
                            "#20a39e",
                            "#8395a7"
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true
                }
            }
        );


        // Guest count bar chart
        if (guestChart) guestChart.destroy();

        guestChart = new Chart(
            document.getElementById("guestChart"),
            {
                type: "bar",
                data: {
                    labels: Object.keys(guestData),
                    datasets: [{
                        label: "Number of Bookings",
                        data: Object.values(guestData),
                        backgroundColor: "#4285f4",
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            }
        );


        // Date-wise booking trend chart
        const dateLabels = Object.keys(dateData).sort();

        const dateValues = dateLabels.map(
            key => dateData[key]
        );

        if (dateChart) dateChart.destroy();

        dateChart = new Chart(
            document.getElementById("dateChart"),
            {
                type: "line",
                data: {
                    labels: dateLabels,
                    datasets: [{
                        label: "Daily Bookings",
                        data: dateValues,
                        borderColor: "#24764b",
                        backgroundColor: "rgba(36, 118, 75, 0.15)",
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            }
        );


        console.log("Village Feast analytics updated.");

        console.log("Total guests:", totalGuests);

        console.log(
            "Average guests per booking:",
            validGuestBookings
                ? (totalGuests / validGuestBookings).toFixed(1)
                : 0
        );

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
            updateAnalytics(bookings);

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

                    if (
                        String(booking.status).trim().toLowerCase() ===
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


                // Existing Refresh button
                const refreshButton = document.createElement("button");

                refreshButton.textContent = "Refresh";

                refreshButton.addEventListener("click", loadBookings);

                actionCell.appendChild(refreshButton);


                // Existing Delete button for completed bookings
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


    // Refresh analytics using the latest database records
    if (refreshAnalyticsBtn) {

        refreshAnalyticsBtn.addEventListener("click", loadBookings);

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
