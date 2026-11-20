
/* ==========================================
   PARCELTRACK MINDANAO
   Parcel Management + Leaflet + OpenWeather
========================================== */


/* ==========================================
   1. CONFIGURATION AND STORAGE
========================================== */

const PARCEL_STORAGE_KEY = "parceltrack_mindanao_parcels";
const API_STORAGE_KEY = "parceltrack_openweather_key";

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
  gensan: {
    name: "General Santos City",
    lat: 6.1164,
    lng: 125.1716,
    weatherCard: null
  }
};


/* ==========================================
   2. SAMPLE PARCELS
========================================== */

const sampleParcels = {
  MND123456789: {
    status: "In Transit",
    origin: "davao",
    destination: "iligan",
    etaDate: "2026-11-22",
    etaTime: "15:00"
  },
  MND987654321: {
    status: "In Transit",
    origin: "cdo",
    destination: "butuan",
    etaDate: "2026-11-21",
    etaTime: "11:00"
  },
  MND555666777: {
    status: "In Transit",
    origin: "gensan",
    destination: "davao",
    etaDate: "2026-11-21",
    etaTime: "16:30"
  }
};

let parcels = loadParcels();
let selectedTrackingNumber = null;


/* ==========================================
   3. LOAD AND SAVE PARCELS
========================================== */

function loadParcels() {
  try {
    const saved = localStorage.getItem(PARCEL_STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Could not load parcel records:", error);
  }

  return { ...sampleParcels };
}

function saveParcels() {
  try {
    localStorage.setItem(
      PARCEL_STORAGE_KEY,
      JSON.stringify(parcels)
    );
    return true;
  } catch (error) {
    console.error("Could not save parcel records:", error);
    return false;
  }
}


/* ==========================================
   4. API KEY SETTINGS
========================================== */

function getApiKey() {
  return localStorage.getItem(API_STORAGE_KEY) || "";
}

const apiKeyInput = document.getElementById("api-key-input");
const apiKeyForm = document.getElementById("api-key-form");
const apiKeyMessage = document.getElementById("api-key-message");

apiKeyForm.addEventListener("submit", function(event) {
  event.preventDefault();

  const key = apiKeyInput.value.trim();

  if (!key) {
    apiKeyMessage.textContent = "Please enter an API key.";
    return;
  }

  try {
    localStorage.setItem(API_STORAGE_KEY, key);

    apiKeyInput.value = "";
    apiKeyMessage.textContent = "API key saved successfully.";

    loadAllWeather();
  } catch (error) {
    apiKeyMessage.textContent = "Could not save API key in this browser.";
  }
});

document
  .getElementById("toggle-api-key")
  .addEventListener("click", function() {
    const isHidden = apiKeyInput.type === "password";

    apiKeyInput.type = isHidden ? "text" : "password";
    this.textContent = isHidden ? "Hide" : "Show";
  });

document
  .getElementById("remove-api-key")
  .addEventListener("click", function() {
    localStorage.removeItem(API_STORAGE_KEY);

    apiKeyInput.value = "";
    apiKeyInput.type = "password";

    apiKeyMessage.textContent = "API key removed.";

    loadAllWeather();
  });


/* ==========================================
   5. LEAFLET MAP
========================================== */

const map = L.map("map").setView([7.9, 125.0], 7);

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }
).addTo(map);

const markerLayer = L.layerGroup().addTo(map);

let routeLine = null;


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


/* ==========================================
   6. CREATE PARCEL ROUTE
========================================== */

function createParcelRoute(parcel) {
  const routeKeys = [];

  function addLocation(key) {
    if (
      locations[key] &&
      routeKeys[routeKeys.length - 1] !== key
    ) {
      routeKeys.push(key);
    }
  }

  addLocation(parcel.origin);

  // Manolo Fortich is the main sorting hub.
  if (parcel.origin !== "manolo" &&
      parcel.destination !== "manolo") {
    addLocation("manolo");
  }

  addLocation(parcel.destination);

  return routeKeys.map((key, index) => ({
    location: key,
    description:
      index === 0
        ? "Parcel received"
        : index === routeKeys.length - 1
          ? "Final destination"
          : "Parcel processed at sorting hub",
    detail:
      key === "manolo"
        ? "Main distribution center"
        : index === 0
          ? "Origin facility"
          : "Delivery facility",
    status:
      index === routeKeys.length - 1
        ? "current"
        : "completed"
  }));
}


/* ==========================================
   7. DISPLAY ROUTE ON MAP
========================================== */

function updateMap(parcel) {
  markerLayer.clearLayers();

  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }

  const route = createParcelRoute(parcel);
  const coordinates = [];

  route.forEach((stop, index) => {
    const place = locations[stop.location];

    if (!place) return;

    const point = [place.lat, place.lng];
    coordinates.push(point);

    let markerColor = "#1677d2";

    if (index === 0) {
      markerColor = "#16a36a";
    }

    if (index === route.length - 1) {
      markerColor = "#ed9a32";
    }

    if (stop.location === "manolo") {
      markerColor = "#1677d2";
    }

    L.marker(point, {
      icon: createMarkerIcon(markerColor)
    })
      .bindPopup(`
        <strong>${place.name}</strong><br>
        ${stop.description}<br>
        <small>${stop.detail}</small>
      `)
      .addTo(markerLayer);
  });

  if (coordinates.length > 1) {
    routeLine = L.polyline(coordinates, {
      color: "#1677d2",
      weight: 5,
      opacity: 0.85,
      dashArray: "10, 8"
    }).addTo(map);

    map.fitBounds(routeLine.getBounds(), {
      padding: [45, 45]
    });
  } else if (coordinates.length === 1) {
    map.setView(coordinates[0], 10);
  }
}


/* ==========================================
   8. UPDATE TIMELINE
========================================== */

function updateTimeline(parcel) {
  const routeTrack = document.getElementById("route-track");

  routeTrack.replaceChildren();

  const route = createParcelRoute(parcel);

  route.forEach(stop => {
    const place = locations[stop.location];

    const element = document.createElement("div");
    element.className = `route-stop ${stop.status}`;

    const marker = document.createElement("div");
    marker.className = "route-marker";
    marker.textContent =
      stop.status === "completed" ? "✓" : "●";

    const info = document.createElement("div");
    info.className = "route-info";

    const heading = document.createElement("h4");
    heading.textContent = place.name;

    const description = document.createElement("p");
    description.textContent = stop.description;

    const detail = document.createElement("small");
    detail.textContent = stop.detail;

    info.append(heading, description, detail);
    element.append(marker, info);
    routeTrack.appendChild(element);
  });
}


/* ==========================================
   9. ETA CALCULATION
========================================== */

function formatEta(date, time) {
  const eta = new Date(`${date}T${time}:00`);

  if (Number.isNaN(eta.getTime())) {
    return {
      date: "Not available",
      time: "Not available",
      remaining: "Not available"
    };
  }

  const now = new Date();
  const difference = eta.getTime() - now.getTime();

  const dateText = eta.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const timeText = eta.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit"
  });

  let remaining;

  if (difference <= 0) {
    remaining = "ETA passed";
  } else {
    const totalMinutes = Math.ceil(difference / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      remaining = `${days}d ${hours}h`;
    } else if (hours > 0) {
      remaining = `${hours}h ${minutes}m`;
    } else {
      remaining = `${minutes} minutes`;
    }
  }

  return {
    date: dateText,
    time: timeText,
    remaining
  };
}


/* ==========================================
   10. DISPLAY SELECTED PARCEL
========================================== */

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

  if (!origin || !destination) {
    message.textContent = "This parcel has invalid location information.";
    return;
  }

  selectedTrackingNumber = trackingNumber;

  const route = createParcelRoute(parcel);
  const nextLocation = route[1]
    ? locations[route[1].location].name
    : destination.name;

  const eta = formatEta(parcel.etaDate, parcel.etaTime);

  document.getElementById("tracking-code").textContent =
    trackingNumber;

  document.getElementById("shipment-status").textContent =
    parcel.status;

  document.getElementById("origin-location").textContent =
    origin.name;

  document.getElementById("destination-location").textContent =
    destination.name;

  document.getElementById("next-location").textContent =
    nextLocation;

  document.getElementById("eta-date").textContent =
    eta.date;

  document.getElementById("eta-time").textContent =
    eta.time;

  document.getElementById("remaining-time").textContent =
    eta.remaining;

  message.textContent = "Parcel information loaded successfully.";
  message.style.color = "#b9f3d1";

  updateTimeline(parcel);
  updateMap(parcel);
  renderParcelList();
}


/* ==========================================
   11. SEARCH PARCEL
========================================== */

document
  .getElementById("track-form")
  .addEventListener("submit", function(event) {
    event.preventDefault();

    const trackingNumber = document
      .getElementById("tracking-number")
      .value
      .trim()
      .toUpperCase();

    displayParcel(trackingNumber);
  });


/* ==========================================
   12. ADD NEW PARCEL
========================================== */

const addParcelForm = document.getElementById("add-parcel-form");

addParcelForm.addEventListener("submit", function(event) {
  event.preventDefault();

  const trackingNumber = document
    .getElementById("new-tracking-number")
    .value
    .trim()
    .toUpperCase();

  const origin = document.getElementById("parcel-origin").value;
  const destination = document.getElementById("parcel-destination").value;
  const etaDate = document.getElementById("parcel-eta-date").value;
  const etaTime = document.getElementById("parcel-eta-time").value;

  const message = document.getElementById("add-parcel-message");

  if (!trackingNumber || !origin || !destination || !etaDate || !etaTime) {
    message.textContent = "Please complete all parcel information.";
    return;
  }

  if (!/^[A-Z0-9-]{5,30}$/.test(trackingNumber)) {
    message.textContent =
      "Use 5–30 characters: letters, numbers, or hyphens.";
    return;
  }

  if (parcels[trackingNumber]) {
    message.textContent = "That tracking number already exists.";
    return;
  }

  if (origin === destination) {
    message.textContent =
      "Origin and destination must be different.";
    return;
  }

  const eta = new Date(`${etaDate}T${etaTime}:00`);

  if (Number.isNaN(eta.getTime()) || eta <= new Date()) {
    message.textContent =
      "Please select an estimated arrival time in the future.";
    return;
  }

  parcels[trackingNumber] = {
    status: "In Transit",
    origin,
    destination,
    etaDate,
    etaTime
  };

  if (!saveParcels()) {
    delete parcels[trackingNumber];
    message.textContent =
      "Could not save this parcel. Check your browser storage settings.";
    return;
  }

  message.textContent = "Parcel added successfully!";

  addParcelForm.reset();

  renderParcelList();
  displayParcel(trackingNumber);

  document.getElementById("tracking").scrollIntoView({
    behavior: "smooth"
  });
});


/* ==========================================
   13. RENDER REGISTERED PARCELS
========================================== */

function renderParcelList() {
  const container = document.getElementById("parcel-list");

  container.replaceChildren();

  const entries = Object.entries(parcels);

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No parcels have been registered.";
    container.appendChild(empty);
    return;
  }

  entries.forEach(([trackingNumber, parcel]) => {
    const origin = locations[parcel.origin];
    const destination = locations[parcel.destination];

    if (!origin || !destination) return;

    const card = document.createElement("article");
    card.className = "parcel-item";

    const details = document.createElement("div");

    const title = document.createElement("h4");
    title.textContent = trackingNumber;

    const routeText = document.createElement("p");
    routeText.textContent =
      `${origin.name} → ${destination.name}`;

    details.append(title, routeText);

    const actions = document.createElement("div");
    actions.className = "parcel-item-actions";

    const viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.textContent = "View Route";

    viewButton.addEventListener("click", () => {
      displayParcel(trackingNumber);

      document.getElementById("tracking").scrollIntoView({
        behavior: "smooth"
      });
    });

    actions.appendChild(viewButton);

    if (!Object.hasOwn(sampleParcels, trackingNumber)) {
      const deleteButton = document.createElement("button");

      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.className = "delete-parcel";

      deleteButton.addEventListener("click", () => {
        deleteParcel(trackingNumber);
      });

      actions.appendChild(deleteButton);
    }

    card.append(details, actions);
    container.appendChild(card);
  });
}


/* ==========================================
   14. DELETE PARCEL
========================================== */

function deleteParcel(trackingNumber) {
  const confirmed = confirm(
    `Are you sure you want to delete parcel ${trackingNumber}?`
  );

  if (!confirmed) return;

  delete parcels[trackingNumber];

  if (!saveParcels()) {
    alert("Could not save the parcel changes.");
    return;
  }

  renderParcelList();

  if (selectedTrackingNumber === trackingNumber) {
    const firstRemaining = Object.keys(parcels)[0];

    if (firstRemaining) {
      displayParcel(firstRemaining);
    } else {
      selectedTrackingNumber = null;

      document.getElementById("tracking-code").textContent = "No parcel selected";
      document.getElementById("shipment-status").textContent = "No shipment";
      document.getElementById("origin-location").textContent = "—";
      document.getElementById("destination-location").textContent = "—";
      document.getElementById("next-location").textContent = "—";
      document.getElementById("eta-date").textContent = "—";
      document.getElementById("eta-time").textContent = "—";
      document.getElementById("remaining-time").textContent = "—";

      document.getElementById("route-track").replaceChildren();
      markerLayer.clearLayers();

      if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }

      map.setView([7.9, 125.0], 7);
    }
  }
}


/* ==========================================
   15. OPENWEATHER API
========================================== */

async function getWeather(locationKey) {
  const place = locations[locationKey];

  if (!place || !place.weatherCard) return;

  const card = document.getElementById(place.weatherCard);
  const apiKey = getApiKey();

  if (!apiKey) {
    card.innerHTML = `
      <h3>${place.name}</h3>
      <p class="weather-loading">
        Add your API key in Settings to load weather.
      </p>
    `;
    return;
  }

  card.innerHTML = `
    <h3>${place.name}</h3>
    <p class="weather-loading">Loading weather...</p>
  `;

  const url =
    "https://api.openweathermap.org/data/2.5/weather" +
    `?lat=${place.lat}` +
    `&lon=${place.lng}` +
    `&appid=${encodeURIComponent(apiKey)}` +
    "&units=metric";

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid or inactive API key.");
      }

      if (response.status === 429) {
        throw new Error("Weather API request limit reached.");
      }

      throw new Error(`Weather service error (${response.status}).`);
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


/* ==========================================
   16. LOAD ALL WEATHER CARDS
========================================== */

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
    weatherLocations.map(key => getWeather(key))
  );

  updatedLabel.textContent =
    "Last checked: " + new Date().toLocaleString();
}

document
  .getElementById("refresh-weather")
  .addEventListener("click", loadAllWeather);


/* ==========================================
   17. INITIALIZE WEBSITE
========================================== */

renderParcelList();

const firstParcel = Object.keys(parcels)[0];

if (firstParcel) {
  displayParcel(firstParcel);
}

loadAllWeather();
