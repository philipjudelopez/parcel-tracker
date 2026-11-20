
// =====================================
// PARCELTRACK MINDANAO
// Vanilla JavaScript
// =====================================

// Get HTML elements

const trackingForm = document.getElementById("track-form");

const trackingInput = document.getElementById("tracking-number");

const trackingCode = document.getElementById("tracking-code");

const formMessage = document.getElementById("form-message");


// Handle tracking form submission

trackingForm.addEventListener("submit", function(event) {

    // Prevent page reload
    event.preventDefault();

    // Get tracking number
    const trackingNumber = trackingInput.value.trim();

    // Validate input
    if (!trackingNumber) {

        formMessage.textContent =
            "Please enter a tracking number.";

        trackingInput.focus();

        return;
    }

    // Update displayed tracking number
    trackingCode.textContent =
        trackingNumber.toUpperCase();

    // Display confirmation
    formMessage.textContent =
        "Demo preview: sample Mindanao shipment details are shown. Connect your courier system for live tracking.";

});

