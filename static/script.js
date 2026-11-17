// Village Feast WhatsApp + Database Booking

const bookingForm = document.getElementById("bookingForm");

const phoneNumber = "918008127068";

bookingForm.addEventListener("submit", async function(event) {
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

    // Open a temporary tab to avoid popup blocking
    const whatsappWindow = window.open("about:blank", "_blank");

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                phone,
                eventType,
                date,
                guests,
                location,
                requirements
            })
        });

        if (!response.ok) {
            throw new Error("Order could not be saved");
        }

        alert("Order saved successfully!");

        if (whatsappWindow) {
            whatsappWindow.location.href = url;
        } else {
            window.location.href = url;
        }

    } catch (error) {
        if (whatsappWindow) {
            whatsappWindow.close();
        }

        alert("Order could not be saved. Please try again.");
        console.error(error);
    }
});
