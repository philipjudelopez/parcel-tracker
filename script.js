
/* ==========================================
   PARCELTRACK MINDANAO
   Parcel Management + Leaflet + OpenWeather
========================================== */


/* ==========================================
   1. CONFIGURATION AND STORAGE
========================================== */

const PARCEL_STORAGE_KEY = "parceltrack_mindanao_parcels";
const API_STORAGE_KEY = "parceltrack_openweather_key";

/* VISIBLE NOTIFICATION SYSTEM */
function showNotification(message, type = "info", title = "") {
  const container = document.getElementById("notification-container");
  if (!container) return;

  const settings = {
    success: { icon: "✓", title: "Success" },
    error: { icon: "✕", title: "Something went wrong" },
    warning: { icon: "!", title: "Please check" },
    info: { icon: "i", title: "Notification" }
  };

  const selected = settings[type] || settings.info;
  const toast = document.createElement("div");
  toast.className = `notification ${type}`;

  const icon = document.createElement("span");
  icon.className = "notification-icon";
  icon.textContent = selected.icon;

  const content = document.createElement("div");
  content.className = "notification-content";

  const heading = document.createElement("div");
  heading.className = "notification-title";
  heading.textContent = title || selected.title;

  const body = document.createElement("div");
  body.className = "notification-message";
  body.textContent = message;

  content.append(heading, body);

  const close = document.createElement("button");
  close.className = "notification-close";
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss notification");
  close.textContent = "×";

  toast.append(icon, content, close);
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  let dismissed = false;

  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  };

  close.addEventListener("click", dismiss);
  setTimeout(dismiss, 6500);
}

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

const CUSTOM_LOCATIONS_STORAGE_KEY = "parceltrack_custom_locations";

try {
  const savedCustomLocations = JSON.parse(
    localStorage.getItem(CUSTOM_LOCATIONS_STORAGE_KEY) || "{}"
  );

  if (
    savedCustomLocations &&
    typeof savedCustomLocations === "object"
  ) {
    Object.assign(locations, savedCustomLocations);
  }
} catch (error) {
  console.warn("Could not restore custom places:", error);
}

function saveCustomLocations() {
  const custom = Object.fromEntries(
    Object.entries(locations).filter(([key]) =>
      key.startsWith("custom_")
    )
  );

  localStorage.setItem(
    CUSTOM_LOCATIONS_STORAGE_KEY,
    JSON.stringify(custom)
  );
}


/* ==========================================
   2. SAMPLE PARCELS
========================================== */

const sampleParcels = {
  MND123456789: {
    status: "In Transit",
    origin: "davao",
    destination: "iligan"
  },
  MND987654321: {
    status: "In Transit",
    origin: "cdo",
    destination: "butuan"
  },
  MND555666777: {
    status: "In Transit",
    origin: "gensan",
    destination: "davao"
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

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
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
    showNotification(
      "Enter your OpenWeatherMap API key before saving.",
      "warning",
      "API key required"
    );
    return;
  }

  try {
    localStorage.setItem(API_STORAGE_KEY, key);

    apiKeyInput.value = "";
    apiKeyMessage.textContent = "API key saved successfully.";

    showNotification(
      "Your OpenWeatherMap API key has been saved.",
      "success",
      "Settings updated"
    );

    loadAllWeather();

    if (selectedTrackingNumber && parcels[selectedTrackingNumber]) {
      loadDestinationWeather(
        locations[parcels[selectedTrackingNumber].destination]
      );
    }
  } catch (error) {
    apiKeyMessage.textContent =
      "Could not save API key in this browser.";

    showNotification(
      "The API key could not be saved in this browser.",
      "error",
      "Unable to save key"
    );
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

    showNotification(
      "The saved OpenWeatherMap API key was removed.",
      "success",
      "API key removed"
    );

    loadAllWeather();
  });


/* ==========================================
   5. LEAFLET MAP
========================================== */

const map = L.map("map").setView([7.9, 125.0], 7);

// Responsive Leaflet map resizing.
let mapResizeFrame = null;

function refreshMapSize() {
  if (mapResizeFrame) {
    cancelAnimationFrame(mapResizeFrame);
  }

  mapResizeFrame = requestAnimationFrame(() => {
    map.invalidateSize({
      pan: false,
      animate: false
    });

    mapResizeFrame = null;
  });
}

window.addEventListener("resize", refreshMapSize, {
  passive: true
});

window.addEventListener("orientationchange", () => {
  setTimeout(refreshMapSize, 180);
}, {
  passive: true
});

if ("ResizeObserver" in window) {
  const mapPanelObserver = new ResizeObserver(refreshMapSize);
  const mapPanel = document.querySelector(".map-panel");

  if (mapPanel) {
    mapPanelObserver.observe(mapPanel);
  }
}

const streetTiles = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }
);

const satelliteTiles = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri"
  }
).addTo(map);

document.getElementById("street-mode").addEventListener("click", () => {
  if (map.hasLayer(satelliteTiles)) {
    map.removeLayer(satelliteTiles);
  }

  if (!map.hasLayer(streetTiles)) {
    streetTiles.addTo(map);
  }

  document.getElementById("street-mode").classList.add("active");
  document.getElementById("satellite-mode").classList.remove("active");
});

document.getElementById("satellite-mode").addEventListener("click", () => {
  if (map.hasLayer(streetTiles)) {
    map.removeLayer(streetTiles);
  }

  if (!map.hasLayer(satelliteTiles)) {
    satelliteTiles.addTo(map);
  }

  document.getElementById("satellite-mode").classList.add("active");
  document.getElementById("street-mode").classList.remove("active");
});

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
  if (
    parcel.origin !== "manolo" &&
    parcel.destination !== "manolo"
  ) {
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

function updateMap(parcel, routeData) {
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
        <div class="pin-weather" id="pin-weather-${stop.location}">
          <strong>Weather:</strong> Loading...
        </div>
      `)
      .on("popupopen", () => loadPinWeather(stop.location))
      .addTo(markerLayer);
  });

  if (coordinates.length > 1) {
    const roadCoordinates = routeData && routeData.geometry
      ? routeData.geometry.coordinates.map(point => [
          point[1],
          point[0]
        ])
      : coordinates;

    routeLine = L.polyline(roadCoordinates, {
      color: "#1677d2",
      weight: 5,
      opacity: 0.85,
      dashArray: routeData && routeData.geometry ? null : "10, 8"
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
   9. AUTOMATIC ROAD ROUTE DISTANCE
========================================== */

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "Unavailable";

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

async function calculateRoadRoute(route) {
  const validPlaces = route
    .map(stop => locations[stop.location])
    .filter(Boolean);

  if (validPlaces.length < 2) {
    return {
      distance: 0,
      geometry: null,
      source: "single location"
    };
  }

  const coordinates = validPlaces
    .map(place => `${place.lng},${place.lat}`)
    .join(";");

  const url =
    `https://router.project-osrm.org/route/v1/driving/${coordinates}` +
    "?overview=full&geometries=geojson&steps=false";

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Routing service error (${response.status})`);
    }

    const data = await response.json();

    if (
      data.code !== "Ok" ||
      !data.routes ||
      !data.routes.length
    ) {
      throw new Error("No road route was returned.");
    }

    return {
      distance: data.routes[0].distance,
      geometry: data.routes[0].geometry,
      source: "road route"
    };
  } catch (error) {
    console.warn("Road route calculation failed:", error);

    let distance = 0;
    const toRad = value => value * Math.PI / 180;

    for (let i = 1; i < validPlaces.length; i++) {
      const a = validPlaces[i - 1];
      const b = validPlaces[i];

      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);

      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) *
        Math.cos(toRad(b.lat)) *
        Math.sin(dLng / 2) ** 2;

      distance +=
        6371000 *
        2 *
        Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    }

    return {
      distance,
      geometry: null,
      source: "straight-line estimate"
    };
  }
}


/* ==========================================
   10. DISPLAY SELECTED PARCEL
========================================== */

async function displayParcel(trackingNumber) {
  const parcel = parcels[trackingNumber];
  const message = document.getElementById("form-message");

  if (!parcel) {
    message.textContent =
      "Tracking number not found. Please check and try again.";

    message.style.color = "#ffb7b7";

    showNotification(
      "No parcel matches that tracking ID or destination. Check your search and try again.",
      "error",
      "Parcel not found"
    );

    return;
  }

  const origin = locations[parcel.origin];
  const destination = locations[parcel.destination];

  if (!origin || !destination) {
    message.textContent =
      "This parcel has invalid location information.";

    showNotification(
      "This parcel has missing or invalid origin/destination coordinates.",
      "error",
      "Invalid parcel route"
    );

    return;
  }

  selectedTrackingNumber = trackingNumber;

  const route = createParcelRoute(parcel);

  const nextLocation = route[1]
    ? locations[route[1].location].name
    : destination.name;

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

  const distanceElement = document.getElementById("route-distance");
  const distanceNote = document.getElementById("route-distance-note");

  distanceElement.textContent = "Calculating...";
  distanceNote.textContent =
    "Requesting the road route between delivery locations.";

  const routeData = await calculateRoadRoute(route);

  distanceElement.textContent =
    formatDistance(routeData.distance);

  distanceNote.textContent =
    routeData.source === "road route"
      ? "Driving distance along the road route, including the Manolo Fortich sorting hub where applicable."
      : "Road routing is temporarily unavailable. Showing a straight-line distance estimate, not road distance.";

  message.textContent =
    "Parcel information loaded successfully.";

  message.style.color = "#b9f3d1";

  showNotification(
    `Tracking details for ${trackingNumber} are now displayed.`,
    "success",
    "Parcel located"
  );

  updateTimeline(parcel);
  updateMap(parcel, routeData);
  renderParcelList();
  loadDestinationWeather(destination);
}


/* ==========================================
   11. SEARCH PARCEL
========================================== */

document
  .getElementById("track-form")
  .addEventListener("submit", function(event) {
    event.preventDefault();

    const query = document
      .getElementById("tracking-number")
      .value
      .trim();

    const normalized = query.toUpperCase();

    if (parcels[normalized]) {
      displayParcel(normalized);
      return;
    }

    const match = Object.entries(parcels).find(
      ([trackingId, parcel]) => {
        const origin = locations[parcel.origin]?.name || "";
        const destination = locations[parcel.destination]?.name || "";

        return trackingId.toUpperCase().includes(normalized) ||
          origin.toLowerCase().includes(query.toLowerCase()) ||
          destination.toLowerCase().includes(query.toLowerCase());
      }
    );

    if (match) {
      document.getElementById("tracking-number").value = match[0];
      displayParcel(match[0]);
    } else {
      const feedback = document.getElementById("form-message");

      feedback.textContent =
        "No parcel found for that tracking ID or destination.";

      feedback.style.color = "#ffb7b7";

      showNotification(
        "No parcel matched your tracking ID or destination search.",
        "error",
        "Search returned no results"
      );
    }
  });


/* ==========================================
   12. ADD NEW PARCEL
========================================== */

const addParcelForm = document.getElementById("add-parcel-form");

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeMindanaoPlace(query) {
  const params = new URLSearchParams({
    format: "jsonv2",
    q: query.trim(),
    limit: "5",
    countrycodes: "ph",
    viewbox: "121.8,10.1,127.9,4.4",
    bounded: "1",
    addressdetails: "1"
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`
  );

  if (!response.ok) {
    throw new Error(
      "Place search is unavailable. Please try again."
    );
  }

  const results = await response.json();

  if (!results.length) {
    throw new Error(
      `Could not find "${query}" in Mindanao. Include its barangay, municipality, or province.`
    );
  }

  const match = results[0];

  return {
    name: match.display_name.split(",").slice(0, 3).join(","),
    lat: Number(match.lat),
    lng: Number(match.lon),
    weatherCard: null
  };
}

function newCustomLocationKey() {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

addParcelForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const trackingNumber = document
    .getElementById("new-tracking-number")
    .value
    .trim()
    .toUpperCase();

  const originQuery = document
    .getElementById("parcel-origin")
    .value
    .trim();

  const destinationQuery = document
    .getElementById("parcel-destination")
    .value
    .trim();

  const message = document.getElementById("add-parcel-message");

  const submitButton = addParcelForm.querySelector(
    'button[type="submit"]'
  );

  if (!trackingNumber || !originQuery || !destinationQuery) {
    message.textContent =
      "Please complete all parcel information.";

    showNotification(
      "Fill in the tracking ID, origin, and destination.",
      "warning",
      "Missing parcel details"
    );

    return;
  }

  if (!/^[A-Z0-9-]{5,30}$/.test(trackingNumber)) {
    message.textContent =
      "Use 5–30 characters: letters, numbers, or hyphens.";

    showNotification(
      "Tracking IDs must contain 5–30 letters, numbers, or hyphens.",
      "warning",
      "Invalid tracking ID"
    );

    return;
  }

  if (parcels[trackingNumber]) {
    message.textContent =
      "That tracking number already exists.";

    showNotification(
      "A parcel with this tracking ID is already registered.",
      "error",
      "Duplicate tracking ID"
    );

    return;
  }

  if (originQuery.toLowerCase() === destinationQuery.toLowerCase()) {
    message.textContent =
      "Origin and destination must be different.";

    showNotification(
      "Choose two different places for the parcel route.",
      "warning",
      "Invalid route"
    );

    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Finding places...";

  message.textContent =
    "Looking up both locations in Mindanao...";

  showNotification(
    "Finding the origin and destination on the Mindanao map. This may take a moment.",
    "info",
    "Looking up locations"
  );

  let originKey;
  let destinationKey;

  try {
    const originPlace = await geocodeMindanaoPlace(originQuery);

    await delay(1100);

    const destinationPlace =
      await geocodeMindanaoPlace(destinationQuery);

    originKey = newCustomLocationKey();
    destinationKey = newCustomLocationKey();

    locations[originKey] = originPlace;
    locations[destinationKey] = destinationPlace;

    saveCustomLocations();

    parcels[trackingNumber] = {
      status: "In Transit",
      origin: originKey,
      destination: destinationKey
    };

    if (!saveParcels()) {
      delete parcels[trackingNumber];
      delete locations[originKey];
      delete locations[destinationKey];

      saveCustomLocations();

      throw new Error(
        "Could not save parcel data in this browser."
      );
    }

    message.textContent =
      "Parcel added and locations saved!";

    showNotification(
      `${trackingNumber} was added successfully and its route is ready to view.`,
      "success",
      "Parcel added"
    );

    addParcelForm.reset();
    renderParcelList();
    displayParcel(trackingNumber);

    document.getElementById("dashboard").scrollIntoView({
      behavior: "smooth"
    });

  } catch (error) {
    message.textContent =
      error.message || "Could not locate one of those places.";

    showNotification(
      error.message ||
      "Could not locate one of those places. Check the place names and try again.",
      "error",
      "Could not add parcel"
    );

  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "＋ Add Parcel";
  }
});


/* ==========================================
   13. DASHBOARD AND PARCEL LIST
========================================== */

function updateDashboardStats() {
  const all = Object.values(parcels);

  document.getElementById("total-parcels").textContent =
    all.length;

  document.getElementById("transit-parcels").textContent =
    all.filter(p => p.status === "In Transit").length;

  document.getElementById("delivered-parcels").textContent =
    all.filter(p => p.status === "Delivered").length;

  document.getElementById("pending-parcels").textContent =
    all.filter(p => p.status === "Pending").length;
}

function updateDashboardClock() {
  const now = new Date();

  document.getElementById("current-date").textContent =
    now.toLocaleDateString("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });

  document.getElementById("current-time").textContent =
    now.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit"
    });
}

updateDashboardClock();
setInterval(updateDashboardClock, 60000);

function renderParcelList() {
  updateDashboardStats();

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

      document.getElementById("dashboard").scrollIntoView({
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
    showNotification(
      "The parcel could not be deleted because the browser could not save the changes.",
      "error",
      "Delete failed"
    );

    return;
  }

  renderParcelList();

  showNotification(
    `Parcel ${trackingNumber} has been deleted.`,
    "success",
    "Parcel deleted"
  );

  if (selectedTrackingNumber === trackingNumber) {
    const firstRemaining = Object.keys(parcels)[0];

    if (firstRemaining) {
      displayParcel(firstRemaining);
    } else {
      selectedTrackingNumber = null;

      document.getElementById("tracking-code").textContent =
        "No parcel selected";

      document.getElementById("shipment-status").textContent =
        "No shipment";

      document.getElementById("origin-location").textContent = "—";
      document.getElementById("destination-location").textContent = "—";
      document.getElementById("next-location").textContent = "—";
      document.getElementById("route-distance").textContent = "—";

      document.getElementById("route-distance-note").textContent =
        "Select a parcel to calculate its route distance.";

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

      throw new Error(
        `Weather service error (${response.status}).`
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

    showNotification(
      `${place.name}: ${error.message}`,
      "error",
      "Weather update failed"
    );

    card.innerHTML = `
      <h3>${place.name}</h3>
      <p class="weather-error">${error.message}</p>
    `;
  }
}


/* ==========================================
   15A. WEATHER STATUS FOR EACH MAP PIN
========================================== */

async function loadPinWeather(locationKey) {
  const place = locations[locationKey];

  if (!place) return;

  const targetId = `pin-weather-${locationKey}`;
  const target = document.getElementById(targetId);

  if (!target) return;

  const apiKey = getApiKey();

  if (!apiKey) {
    target.innerHTML =
      "<strong>Weather:</strong> Add your OpenWeatherMap API key in Settings.";

    return;
  }

  target.innerHTML =
    "<strong>Weather:</strong> Loading current conditions...";

  try {
    const url =
      "https://api.openweathermap.org/data/2.5/weather" +
      `?lat=${place.lat}&lon=${place.lng}` +
      `&appid=${encodeURIComponent(apiKey)}&units=metric`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid API key");
      }

      throw new Error(
        `Weather unavailable (${response.status})`
      );
    }

    const data = await response.json();

    const condition = data.weather && data.weather[0]
      ? data.weather[0].description
      : "Conditions unavailable";

    const temperature = Math.round(data.main.temp);
    const humidity = data.main.humidity;

    const currentTarget = document.getElementById(targetId);

    if (currentTarget) {
      currentTarget.innerHTML =
        `<strong>Weather:</strong> ${temperature}°C, ${condition}` +
        `<br>Humidity: ${humidity}%`;
    }

  } catch (error) {
    const currentTarget = document.getElementById(targetId);

    if (currentTarget) {
      currentTarget.innerHTML =
        `<strong>Weather:</strong> ${error.message}`;
    }
  }
}


async function loadDestinationWeather(place) {
  const apiKey = getApiKey();

  const temp = document.getElementById("destination-temperature");
  const description = document.getElementById("destination-description");

  if (!apiKey) {
    temp.textContent = "--°C";
    description.textContent =
      "Add an OpenWeather key in Settings";

    return;
  }

  try {
    const url =
      `https://api.openweathermap.org/data/2.5/weather?lat=${place.lat}&lon=${place.lng}&appid=${encodeURIComponent(apiKey)}&units=metric`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Weather unavailable");
    }

    const data = await response.json();

    temp.textContent =
      `${Math.round(data.main.temp)}°C`;

    description.textContent =
      `${place.name} · ${data.weather[0].description}`;

    document.getElementById("destination-humidity").textContent =
      `${data.main.humidity}%`;

    document.getElementById("destination-wind").textContent =
      `${Math.round(data.wind.speed * 3.6)} km/h`;

    document.getElementById("destination-rain").textContent =
      `${data.clouds?.all ?? "--"}% cloud cover`;

    document.getElementById("top-temperature").textContent =
      `${Math.round(data.main.temp)}°C`;

    document.getElementById("top-condition").textContent =
      data.weather[0].description;

  } catch (error) {
    description.textContent =
      "Could not load destination weather";

    showNotification(
      `Could not load weather for ${place.name}. Check your API key or connection.`,
      "error",
      "Destination weather unavailable"
    );
  }
}


/* ==========================================
   16. LOAD ALL WEATHER CARDS
========================================== */

async function loadAllWeather() {
  const updatedLabel = document.getElementById("weather-updated");

  updatedLabel.textContent =
    "Updating weather information...";

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

  if (getApiKey()) {
    showNotification(
      "Weather information has been refreshed for the monitored locations.",
      "success",
      "Weather updated"
    );
  }
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
