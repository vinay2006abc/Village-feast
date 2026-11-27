document.addEventListener("DOMContentLoaded", () => {

    // ELEMENTS
    const form = document.getElementById("bookingForm");
    const selectedFoodText = document.getElementById("selectedFoodText");
    const formMessage = document.getElementById("formMessage");
    const submitButton = document.getElementById("submitBooking");
    const successBox = document.getElementById("bookingSuccess");

    // MOBILE NAVIGATION
    const navToggle = document.getElementById("navToggle");
    const navLinks = document.getElementById("navLinks");

    if (navToggle && navLinks) {

        navToggle.addEventListener("click", () => {
            navLinks.classList.toggle("open");
        });

        navLinks.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("open");
            });
        });
    }

    // FOOD MENU SELECTION
    const foodCheckboxes = Array.from(
        document.querySelectorAll('input[name="menuChoice"]')
    );

    function getSelectedFood() {
        return foodCheckboxes
            .filter(item => item.checked)
            .map(item => item.value);
    }

    function updateSelectedFood() {

        const selectedItems = getSelectedFood();

        if (selectedItems.length > 0) {

            selectedFoodText.textContent = selectedItems.join(", ");

        } else {

            selectedFoodText.textContent =
                "No food items selected yet.";
        }
    }

    foodCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", updateSelectedFood);
    });

    updateSelectedFood();


    // BOOKING FORM SUBMISSION
    if (!form) return;

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        formMessage.textContent = "";
        formMessage.className = "form-message";

        successBox.hidden = true;

        // GET CUSTOMER DETAILS
        const bookingData = {

            customerName:
                document.getElementById("customerName").value.trim(),

            customerPhone:
                document.getElementById("customerPhone").value.trim(),

            eventType:
                document.getElementById("eventType").value,

            eventDate:
                document.getElementById("eventDate").value,

            guests:
                document.getElementById("guests").value,

            eventLocation:
                document.getElementById("eventLocation").value.trim(),

            requirements:
                document.getElementById("requirements").value.trim(),

            menuItems: getSelectedFood()
        };


        // VALIDATE FOOD SELECTION
        if (bookingData.menuItems.length === 0) {

            formMessage.textContent =
                "Please select at least one food item.";

            formMessage.classList.add("error");

            return;
        }


        // PREVENT DOUBLE SUBMISSION
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        // OPEN WHATSAPP TAB AFTER USER SUBMISSION
        const whatsappTab = window.open("about:blank", "_blank");

        try {

            // SEND BOOKING TO FLASK BACKEND
            const response = await fetch("/api/bookings", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(bookingData)

            });

            const result = await response.json();

            if (!response.ok || !result.ok) {

                throw new Error(
                    result.error || "Booking submission failed."
                );
            }


            // DATABASE SUCCESS
            formMessage.textContent =
                `Booking #${result.booking_id} saved successfully.`;

            formMessage.classList.add("success");


            // SUCCESS NOTIFICATION
            successBox.hidden = false;

            successBox.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });


            // OPEN WHATSAPP
            if (result.whatsapp_url) {

                if (whatsappTab) {

                    whatsappTab.location.href = result.whatsapp_url;

                } else {

                    window.location.href = result.whatsapp_url;
                }

            } else {

                if (whatsappTab) {
                    whatsappTab.close();
                }

                formMessage.textContent +=
                    " WhatsApp number is not configured.";
            }


            // CLEAR FORM AFTER SUCCESS
            form.reset();

            updateSelectedFood();


        } catch (error) {

            if (whatsappTab) {
                whatsappTab.close();
            }

            formMessage.textContent = error.message;

            formMessage.classList.add("error");

        } finally {

            submitButton.disabled = false;

            submitButton.textContent = "Submit Booking";
        }

    });

});
