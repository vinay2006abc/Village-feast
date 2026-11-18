// Village Feast WhatsApp + SQLite Booking

const bookingForm = document.getElementById("bookingForm");

// Village Feast WhatsApp contact number
const phoneNumber = "918008127068";

bookingForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    // Get customer details
    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const eventType = document.getElementById("eventType").value;
    const date = document.getElementById("eventDate").value;
    const guests = document.getElementById("guests").value;
    const location = document.getElementById("eventLocation").value.trim();
    const requirements = document.getElementById("requirements").value.trim();

    // Validate customer details
    if (!name || !phone || !eventType || !date || !guests || !location) {
        alert("Please fill in all required booking details.");
        return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
        alert("Please enter a valid 10-digit mobile number.");
        return;
    }

    // Prepare booking data for SQLite
    const bookingData = {
        name: name,
        phone: phone,
        eventType: eventType,
        eventDate: date,
        guests: guests,
        address: location,
        requirements: requirements
    };

    try {
        // Save booking in SQLite through Flask
        const response = await fetch("/api/bookings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            alert("Booking could not be saved in the database. Please try again. WhatsApp has not been opened.");
            return;
        }

        // Original WhatsApp message format
        const message =
`Hello Village Feast!

I would like to book catering services.

Customer Name: ${name}
Mobile Number: ${phone}
Event Type: ${eventType}
Event Date: ${date}
Number of Guests: ${guests}
Event Location: ${location}
Additional Requirements: ${requirements || "None"}

Please contact me with the details. Thank you!`;

        // Create WhatsApp URL
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

        // Open WhatsApp after successful database save
        window.location.href = url;

    } catch (error) {
        console.error("Booking error:", error);
        alert("Unable to connect to the booking server. Please try again.");
    }
});
