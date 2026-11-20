
// ParcelTrack Demo Interactions
// Vanilla JavaScript only

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

    // Update tracking number displayed on website
    trackingCode.textContent =
        trackingNumber.toUpperCase();

    // Display confirmation message
    formMessage.textContent =
        "Demo preview: sample shipment details are shown. Connect a courier API for real tracking updates.";

});

// Responsive map illustration
// SVG automatically scales using CSS

window.addEventListener("resize", function() {

    // No external map library is needed.

});
