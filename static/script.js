function bookOnWhatsApp() {

    // Get customer details
    let name = document.getElementById("name").value;
    let phone = document.getElementById("phone").value;
    let event = document.getElementById("event").value;
    let guests = document.getElementById("guests").value;
    let date = document.getElementById("date").value;
    let location = document.getElementById("location").value;

    // Check empty fields
    if (!name || !phone || !event || !guests || !date || !location) {
        alert("Please fill all the details!");
        return;
    }

    // Catering service WhatsApp number
    let ownerNumber = "91800127068";

    // Prepare WhatsApp message
    let message =
        "New Catering Booking Request\n\n" +
        "Customer Name: " + name + "\n" +
        "Phone Number: " + phone + "\n" +
        "Event Type: " + event + "\n" +
        "Number of Guests: " + guests + "\n" +
        "Event Date: " + date + "\n" +
        "Event Location: " + location;

    // Open WhatsApp
    let whatsappURL =
        "https://wa.me/" + ownerNumber +
        "?text=" + encodeURIComponent(message);

    window.open(whatsappURL, "_blank");
}
