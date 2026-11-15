const bookingForm = document.getElementById("bookingForm");

bookingForm.addEventListener("submit", function(event) {
    event.preventDefault();

    alert("Thank you! Your catering booking request has been received.");

    bookingForm.reset();
});
