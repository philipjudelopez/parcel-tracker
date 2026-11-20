
// ========================================
// PARCELTRACK MINDANAO
// PARCEL SEARCH AND ROUTE TRACKING
// ========================================

// SAMPLE SHIPMENT DATABASE
// Replace these records with API data later.

const parcels = {

  "MND123456789": {
    status: "In Transit",
    origin: "Davao City",
    destination: "Iligan City",
    etaDate: "November 22, 2026",
    etaTime: "2:00 PM",
    remaining: "Approximately 2 days remaining",
    route: [
      {
        location: "Davao City",
        description: "Parcel picked up",
        time: "November 19 · 3:20 PM",
        status: "completed"
      },
      {
        location: "Manolo Fortich, Bukidnon",
        description: "Main sorting and distribution hub",
        time: "November 20 · 8:15 AM",
        status: "completed"
      },
      {
        location: "Cagayan de Oro",
        description: "Next delivery station",
        time: "In transit",
        status: "current"
      },
      {
        location: "Iligan City",
        description: "Final delivery destination",
        time: "Awaiting arrival",
        status: ""
      }
    ],
    mapPath: "M500 245 Q440 175 385 142 Q330 120 292 120"
  },

  "MND987654321": {
    status: "Out for Delivery",
    origin: "Cagayan de Oro",
    destination: "Manolo Fortich",
    etaDate: "November 20, 2026",
    etaTime: "4:30 PM",
    remaining: "Expected to arrive today",
    route: [
      {
        location: "Cagayan de Oro",
        description: "Parcel picked up",
        time: "November 19 · 9:00 AM",
        status: "completed"
      },
      {
        location: "Manolo Fortich, Bukidnon",
        description: "Parcel arrived at main hub",
        time: "November 20 · 8:00 AM",
        status: "completed"
      },
      {
        location: "Manolo Fortich",
        description: "Out for delivery",
        time: "November 20 · 10:30 AM",
        status: "current"
      }
    ],
    mapPath: "M292 120 Q340 110 385 142"
  },

  "MND555666777": {
    status: "In Transit",
    origin: "Butuan City",
    destination: "Davao City",
    etaDate: "November 23, 2026",
    etaTime: "11:00 AM",
    remaining: "Approximately 3 days remaining",
    route: [
      {
        location: "Butuan City",
        description: "Parcel received",
        time: "November 19 · 10:00 AM",
        status: "completed"
      },
      {
        location: "Manolo Fortich, Bukidnon",
        description: "Main sorting hub",
        time: "November 20 · 8:00 AM",
        status: "completed"
      },
      {
        location: "Davao City",
        description: "Final delivery destination",
        time: "Awaiting arrival",
        status: "current"
      }
    ],
    mapPath: "M455 70 Q420 110 385 142 Q440 175 500 245"
  }

};


// GET HTML ELEMENTS

const trackingForm = document.getElementById("track-form");

const trackingInput = document.getElementById("tracking-number");

const trackingCode = document.getElementById("tracking-code");

const formMessage = document.getElementById("form-message");

const routeTrack = document.getElementById("route-track");

const etaDate = document.getElementById("eta-date");

const etaTime = document.getElementById("eta-time");

const remainingTime = document.getElementById("remaining-time");

const shipmentStatus = document.getElementById("shipment-status");

const mapRoute = document.getElementById("map-route");


// DISPLAY PARCEL DETAILS

function searchParcel(trackingNumber) {

  const parcel = parcels[trackingNumber.toUpperCase()];

  // CHECK IF TRACKING NUMBER EXISTS

  if (!parcel) {

    formMessage.textContent =
      "Parcel not found. Please check your tracking number.";

    formMessage.className = "form-hint error";

    return;

  }


  // UPDATE PARCEL INFORMATION

  trackingCode.textContent = trackingNumber.toUpperCase();

  etaDate.textContent = parcel.etaDate;

  etaTime.textContent = parcel.etaTime;

  remainingTime.textContent = parcel.remaining;

  shipmentStatus.innerHTML =
    "<i></i> " + parcel.status;


  // UPDATE ROUTE MAP

  mapRoute.setAttribute("d", parcel.mapPath);


  // UPDATE ROUTE TIMELINE

  routeTrack.innerHTML = "";

  parcel.route.forEach(function(stop, index) {

    const stopElement = document.createElement("div");

    stopElement.className =
      "route-stop " + stop.status;

    const marker = document.createElement("div");

    marker.className = "route-marker";

    marker.textContent =
      stop.status === "completed" ? "✓" :
      stop.status === "current" ? "●" : "";

    const details = document.createElement("div");

    const location = document.createElement("b");
    location.textContent = stop.location;

    const description = document.createElement("small");
    description.textContent = stop.description;

    const time = document.createElement("span");
    time.textContent = stop.time;

    details.appendChild(location);
    details.appendChild(description);
    details.appendChild(time);

    stopElement.appendChild(marker);
    stopElement.appendChild(details);

    routeTrack.appendChild(stopElement);

  });


  // UPDATE SEARCH MESSAGE

  formMessage.textContent =
    "Shipment found! Showing your parcel journey.";

  formMessage.className = "form-hint success";


  // UPDATE ORIGIN AND DESTINATION LABELS

  document.getElementById("origin-location").textContent =
    parcel.origin;

  document.getElementById("destination-location").textContent =
    parcel.destination;

  // Scroll to tracking information

  document.querySelector(".tracking-card").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


// SEARCH BUTTON

trackingForm.addEventListener("submit", function(event) {

  event.preventDefault();

  const trackingNumber =
    trackingInput.value.trim();

  if (!trackingNumber) {

    formMessage.textContent =
      "Please enter a tracking number.";

    formMessage.className = "form-hint error";

    return;

  }

  searchParcel(trackingNumber);

});


// LOAD DEFAULT PARCEL

searchParcel("MND123456789");
