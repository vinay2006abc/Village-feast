// Village Feast WhatsApp Booking

const bookingForm = document.getElementById("bookingForm");

// Enter your WhatsApp contact number with country code 91.
// Do not include +, spaces or dashes.
const phoneNumber = "918008127068";

bookingForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const eventType = document.getElementById("eventType").value;
    const date = document.getElementById("eventDate").value;
    const guests = document.getElementById("guests").value;
    const location = document.getElementById("eventLocation").value.trim();
    const requirements = document.getElementById("requirements").value.trim();

    if (!/^[0-9]{10}$/.test(phone)) {
        alert("Please enter a valid 10-digit mobile number.");
        return;
    }

    if (phoneNumber === "918008127068") {
        alert("Please add your WhatsApp contact number in script.js first.");
        return;
    }

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

    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    console.log("Booking form submitted");

    window.open(url, "_blank");
});
