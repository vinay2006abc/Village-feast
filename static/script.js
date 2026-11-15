document.getElementById("bookingForm").addEventListener("submit", function(event) {

    console.log("Booking form submitted");

    event.preventDefault();

});

    alert("Thank you! Your catering booking request has been received.");

    bookingForm.reset();
});
const phoneNumber = "918008127068";

function bookNow() {
    const message = "Hello Village Feast! I want to book your catering service.";

    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
}
