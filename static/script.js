// VILLAGE FEAST - WHATSAPP + BOOKING NOTIFICATION

const bookingForm = document.getElementById("bookingForm");
const bookingNotification = document.getElementById("bookingNotification");
const notificationHeading = document.getElementById("notificationHeading");
const notificationMessage = document.getElementById("notificationMessage");

// Village Feast WhatsApp contact number
const phoneNumber = "918008127068";

// Browser storage key
const bookingStorageKey = "villageFeastBookingToken";


// DISPLAY NOTIFICATION
function showNotification(heading, message, scroll = false) {

    notificationHeading.textContent = heading;
    notificationMessage.textContent = message;

    bookingNotification.hidden = false;

    if (scroll) {
        bookingNotification.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}


// CHECK CUSTOMER BOOKING WHEN THEY RETURN
async function checkPreviousBooking() {

    let bookingToken;

    try {
        bookingToken = localStorage.getItem(bookingStorageKey);
    } catch (error) {
        console.error("Browser storage unavailable:", error);
        return;
    }

    if (!bookingToken) {
        return;
    }

    try {

        const response = await fetch("/api/customer-booking-status", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                booking_token: bookingToken
            }),
            cache: "no-store"
        });

        const result = await response.json();

        if (!response.ok || !result.success) {

            if (response.status === 404) {
                localStorage.removeItem(bookingStorageKey);
            }

            return;
        }

        // Show message according to booking status
        if (result.status === "Pending") {

            showNotification(
                "Booking Submitted Successfully!",
                "Please wait. Our team will contact you soon to confirm your booking."
            );

        } else if (result.status === "Confirmed") {

            showNotification(
                "Your Booking is Confirmed! ❤️",
                "Great news! Your Village Feast catering booking has been confirmed."
            );

        } else if (result.status === "Completed") {

            showNotification(
                "Booking Completed Successfully!",
                "Thank you for choosing Village Feast. We appreciate your support!"
            );

        }

    } catch (error) {

        console.error("Booking status check failed:", error);

    }
}


// CUSTOMER BOOKING SUBMISSION
if (bookingForm) {

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

        // Prevent duplicate submissions
        const submitButton = bookingForm.querySelector(".submit-btn");

        if (submitButton.disabled) {
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Submitting Booking...";

        // Open a new tab immediately to avoid popup blocking
        // WhatsApp will open in this tab after successful saving
        const whatsappWindow = window.open("about:blank", "_blank");

        // Prepare booking data
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

            // Save booking in Neon PostgreSQL through Flask
            const response = await fetch("/api/bookings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(bookingData)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {

                if (whatsappWindow) {
                    whatsappWindow.close();
                }

                alert(
                    result.message ||
                    "Booking could not be saved. Please try again."
                );

                return;
            }

            // Save customer booking reference
            if (result.booking_token) {

                try {
                    localStorage.setItem(
                        bookingStorageKey,
                        result.booking_token
                    );
                } catch (storageError) {
                    console.error(
                        "Unable to save booking reference:",
                        storageError
                    );
                }

            } else {

                console.error("Booking reference was not returned.");
            }

            // Show successful booking notification
            showNotification(
                "Once Booking Submitted Successfully!",
                "Please wait. Our team will contact you soon to confirm your booking.",
                true
            );

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

            // Open WhatsApp in the new tab
            if (whatsappWindow) {

                whatsappWindow.location.href = url;

            } else {

                // Fallback if browser blocks the new tab
                window.location.href = url;
            }

        } catch (error) {

            console.error("Booking error:", error);

            if (whatsappWindow) {
                whatsappWindow.close();
            }

            alert(
                "Unable to connect to the booking server. Please try again."
            );

        } finally {

            submitButton.disabled = false;
            submitButton.textContent = "Submit Booking on WhatsApp";

        }

    });

}


// CHECK PREVIOUS BOOKING WHEN WEBSITE LOADS
checkPreviousBooking();
