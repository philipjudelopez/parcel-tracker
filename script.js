
/* =====================================
   PARCELTRACK MINDANAO
   Parcel Search + Leaflet + OpenWeather
===================================== */


/* =====================================
   1. OPENWEATHER API CONFIGURATION
===================================== */

const OPENWEATHER_API_KEY = "YOUR_API_KEY_HERE";


/* =====================================
   2. MINDANAO LOCATION DATA
   Coordinates: latitude, longitude
===================================== */

const locations = {
  davao: {
    name: "Davao City",
    lat: 7.1907,
    lng: 125.4553,
    weatherCard: "weather-davao"
  },

  manolo: {
    name: "Manolo Fortich",
    lat: 8.3697,
    lng: 124.8642,
    weatherCard: "weather-manolo"
  },

  cdo: {
    name: "Cagayan de Oro",
    lat: 8.4542,
    lng: 124.6319,
    weatherCard: "weather-cdo"
  },

  iligan: {
    name: "Iligan City",
    lat: 8.2280,
    lng: 124.2452,
    weatherCard: "weather-iligan"
  },

  butuan: {
    name: "Butuan City",
    lat: 8.9475,
    lng: 125.5406,
    weatherCard: null
  },

  generalSantos: {
    name: "General Santos City",
    lat: 6.1164,
    lng: 125.1716,
    weatherCard: null
  }
};


/* =====================================
   3. SAMPLE PARCEL DATABASE

   Replace this sample data with your
   actual database/API when available.
===================================== */

const parcels = {
  "MND123456789": {
    status: "In Transit",
    origin: "davao",
    destination: "iligan",
    nextLocation: "manolo",
    etaDate: "November 22, 2026",
    etaTime: "3:00 PM",
    remaining: "2 days",

    route: [
      {
        location: "davao",
        description: "Parcel received",
        detail: "Origin facility",
        status: "completed"
      },
      {
        location: "manolo",
        description: "Sorting hub",
        detail: "Main distribution center",
        status: "current"
      },
      {
        location: "cdo",
        description: "Next distribution point",
        detail: "Regional facility",
        status: "pending"
      },
      {
        location: "iligan",
        description: "Final destination",
        detail: "Awaiting delivery",
        status: "pending"
      }
    ]
  },

  "MND987654321": {
    status: "In Transit",
    origin: "cdo",
    destination: "butuan",
    nextLocation: "butuan",
    etaDate: "November 21, 2026",
    etaTime: "11:00 AM",
    remaining: "1 day",

    route: [
      {
        location: "cdo",
        description: "Parcel received",
        detail: "Origin facility",
        status: "completed"
      },
      {
        location: "manolo",
        description: "Parcel processed",
        detail: "Main sorting hub",
        status: "completed"
      },
      {
        location: "butuan",
        description: "Final destination",
        detail: "Out for delivery",
        status: "current"
      }
    ]
  },

  "MND555666777": {
    status: "In Transit",
    origin: "generalSantos",
    destination: "davao",
    nextLocation: "davao",
    etaDate: "November 21, 2026",
    etaTime: "4:30 PM",
    remaining: "1 day",

    route: [
      {
        location: "generalSantos",
        description: "Parcel received",
        detail: "Origin facility",
        status: "completed"
      },
      {
        location: "davao",
        description: "Final destination",
        detail: "Out for delivery",
        status: "current"
      }
    ]
  }
};


/* =====================================
   4. LEAFLET MAP INITIALIZATION
===================================== */

const map = L.map("map", {
  scrollWheelZoom: true
}).setView([7.9, 125.0], 7);


// OpenStreetMap tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',

  maxZoom: 19
}).addTo(map);


// Marker icons
function createMarkerIcon(color) {
  return L.divIcon({
    className: "custom-map-marker",

    html: `
      <div style="
        width:18px;
        height:18px;
        border-radius:50%;
        background:${color};
        border:3px solid white;
        box-shadow:0 2px 7px rgba(0,0,0,0.35);
      "></div>
    `,

    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}


// Map marker and route layers
const markerLayer = L.layerGroup().addTo(map);

let routeLine = null;


/* =====================================
   5. DRAW PARCEL ROUTE ON MAP
===================================== */

function updateMap(parcel) {
  markerLayer.clearLayers();

  if (routeLine) {
    map.removeLayer(routeLine);
  }

  const routeCoordinates = [];

  parcel.route.forEach((stop, index) => {
    const place = locations[stop.location];

    if (!place) return;

    const coordinates = [place.lat, place.lng];

    routeCoordinates.push(coordinates);

    let markerColor = "#1677d2";

    if (index === 0) {
      markerColor = "#16a36a";
    }

    if (stop.location === "manolo") {
      markerColor = "#1677d2";
    }

    if (index === parcel.route.length - 1) {
      markerColor = "#ed9a32";
    }

    const marker = L.marker(coordinates, {
      icon: createMarkerIcon(markerColor)
    });

    marker.bindPopup(`
      <strong>${place.name}</strong><br>
      ${stop.description}<br>
      <small>${stop.detail}</small>
    `);

    marker.addTo(markerLayer);
  });


  // Draw route line
  if (routeCoordinates.length > 1) {
    routeLine = L.polyline(routeCoordinates, {
      color: "#1677d2",
      weight: 5,
      opacity: 0.85,
      dashArray: "10, 8"
    }).addTo(map);

    map.fitBounds(routeLine.getBounds(), {
      padding: [45, 45]
    });
  } else if (routeCoordinates.length === 1) {
    map.setView(routeCoordinates[0], 10);
  }
}


/* =====================================
   6. UPDATE ROUTE TIMELINE
===================================== */

function updateTimeline(parcel) {
  const routeTrack = document.getElementById("route-track");

  routeTrack.innerHTML = "";

  parcel.route.forEach(stop => {
    const place = locations[stop.location];

    if (!place) return;

    const stopElement = document.createElement("div");

    stopElement.className = `route-stop ${stop.status}`;

    const markerSymbol =
      stop.status === "completed" ? "✓" :
      stop.status === "current" ? "●" : "○";

    stopElement.innerHTML = `
      <div class="route-marker">${markerSymbol}</div>

      <div class="route-info">
        <h4>${place.name}</h4>
        <p>${stop.description}</p>
        <small>${stop.detail}</small>
      </div>
    `;

    routeTrack.appendChild(stopElement);
  });
}


/* =====================================
   7. UPDATE PARCEL INFORMATION
===================================== */

function displayParcel(trackingNumber) {
  const parcel = parcels[trackingNumber];

  const message = document.getElementById("form-message");

  if (!parcel) {
    message.textContent =
      "Tracking number not found. Please check and try again.";

    message.style.color = "#ffb7b7";

    return;
  }

  const origin = locations[parcel.origin];
  const destination = locations[parcel.destination];
  const next = locations[parcel.nextLocation];

  document.getElementById("tracking-code").textContent =
    trackingNumber;

  document.getElementById("shipment-status").textContent =
    parcel.status;

  document.getElementById("origin-location").textContent =
    origin.name;

  document.getElementById("destination-location").textContent =
    destination.name;

  document.getElementById("next-location").textContent =
    next ? next.name : "To be determined";

  document.getElementById("eta-date").textContent =
    parcel.etaDate;

  document.getElementById("eta-time").textContent =
    parcel.etaTime;

  document.getElementById("remaining-time").textContent =
    parcel.remaining;

  message.textContent = "Parcel information loaded successfully.";

  message.style.color = "#b9f3d1";

  updateTimeline(parcel);
  updateMap(parcel);
}


/* =====================================
   8. PARCEL SEARCH FORM
===================================== */

const trackingForm = document.getElementById("track-form");

trackingForm.addEventListener("submit", function(event) {
  event.preventDefault();

  const trackingNumber = document
    .getElementById("tracking-number")
    .value
    .trim()
    .toUpperCase();

  displayParcel(trackingNumber);
});


/* =====================================
   9. OPENWEATHER CURRENT WEATHER
===================================== */

async function getWeather(locationKey) {
  const place = locations[locationKey];

  if (!place || !place.weatherCard) return;

  const card = document.getElementById(place.weatherCard);

  if (
    !OPENWEATHER_API_KEY ||
    OPENWEATHER_API_KEY === "YOUR_API_KEY_HERE"
  ) {
    card.innerHTML = `
      <h3>${place.name}</h3>
      <p class="weather-error">
        Add your OpenWeatherMap API key in script.js.
      </p>
    `;
    return;
  }

  card.innerHTML = `
    <h3>${place.name}</h3>
    <p class="weather-loading">Loading weather...</p>
  `;

  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${place.lat}` +
    `&lon=${place.lng}` +
    `&appid=${OPENWEATHER_API_KEY}` +
    `&units=metric`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? "Invalid API key or key not activated."
          : `Weather service error (${response.status}).`
      );
    }

    const data = await response.json();

    const temperature = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const humidity = data.main.humidity;
    const wind = data.wind.speed;
    const description = data.weather[0].description;
    const icon = data.weather[0].icon;

    card.innerHTML = `
      <h3>${place.name}</h3>

      <img
        class="weather-icon"
        src="https://openweathermap.org/img/wn/${icon}@2x.png"
        alt="${description}"
      >

      <div class="temperature">${temperature}°C</div>

      <p class="description">${description}</p>

      <div class="weather-extra">
        <div>Feels like: ${feelsLike}°C</div>
        <div>Humidity: ${humidity}%</div>
        <div>Wind speed: ${wind} m/s</div>
      </div>
    `;

  } catch (error) {
    console.error(`Weather error for ${place.name}:`, error);

    card.innerHTML = `
      <h3>${place.name}</h3>
      <p class="weather-error">${error.message}</p>
    `;
  }
}


/* =====================================
   10. LOAD ALL WEATHER LOCATIONS
===================================== */

async function loadAllWeather() {
  const updatedLabel = document.getElementById("weather-updated");

  updatedLabel.textContent = "Updating weather information...";

  const weatherLocations = [
    "davao",
    "manolo",
    "cdo",
    "iligan"
  ];

  await Promise.all(
    weatherLocations.map(location => getWeather(location))
  );

  updatedLabel.textContent =
    "Last checked: " + new Date().toLocaleString();
}


/* =====================================
   11. REFRESH WEATHER BUTTON
===================================== */

document
  .getElementById("refresh-weather")
  .addEventListener("click", loadAllWeather);


/* =====================================
   12. INITIALIZE WEBSITE
===================================== */

// Load the default sample parcel
displayParcel("MND123456789");

// Load weather data
loadAllWeather();
