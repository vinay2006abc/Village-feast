document.getElementById("bookingForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;
    const eventType = document.getElementById("eventType").value;
    const date = document.getElementById("date").value;
    const guests = document.getElementById("guests").value;
    const location = document.getElementById("location").value;
    const requirements = document.getElementById("requirements").value;

    // Replace with your WhatsApp number
    const whatsappNumber = "918008127068";

    const message = `
*VILLAGE FEAST BOOKING*

Name: ${name}
Phone: ${phone}
Event: ${eventType}
Date: ${date}
Guests: ${guests}
Location: ${location}
Requirements: ${requirements || "None"}
`;

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
});
