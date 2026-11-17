// Village Feast WhatsApp Booking

const bookingForm = document.getElementById("bookingForm");

// Village Feast WhatsApp contact number
const phoneNumber = "918008127068";

bookingForm.addEventListener("submit", function(event) {
    event.preventDefault();

    // Get customer details
    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const eventType = document.getElementById("eventType").value;
    const date = document.getElementById("eventDate").value;
    const guests = document.getElementById("guests").value;
    const location = document.getElementById("eventLocation").value.trim();
    const requirements = document.getElementById("requirements").value.trim();

    // Validate customer mobile number
    if (!/^[0-9]{10}$/.test(phone)) {
        alert("Please enter a valid 10-digit mobile number.");
        return;
    }

    // Booking message
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

    // Open WhatsApp
    window.location.href = url;
});
