
/* ==========================================
   MINDANAO PARCEL TRACKER
   Redesigned Dashboard JavaScript
========================================== */

const PARCEL_STORAGE_KEY = "parceltrack_mindanao_parcels";
const API_STORAGE_KEY = "parceltrack_openweather_key";
const LOCATION_STORAGE_KEY = "parceltrack_custom_locations";

const HUB = {
    name: "Manolo Fortich, Bukidnon",
    lat: 8.3695,
    lng: 124.8658
};

const locations = {
    "Davao City": { lat: 7.1907, lng: 125.4553 },
    "Manolo Fortich": { lat: 8.3695, lng: 124.8658 },
    "Manolo Fortich, Bukidnon": { lat: 8.3695, lng: 124.8658 },
    "Cagayan de Oro": { lat: 8.4542, lng: 124.6319 },
    "Iligan City": { lat: 8.2280, lng: 124.2452 },
    "Butuan City": { lat: 8.9475, lng: 125.5406 },
    "General Santos City": { lat: 6.1164, lng: 125.1716 },
    "Malaybalay City": { lat: 8.1575, lng: 125.1278 },
    "Valencia City": { lat: 7.9064, lng: 125.0942 },
    "Ozamiz City": { lat: 8.1481, lng: 123.8405 },
    "Dipolog City": { lat: 8.5880, lng: 123.3409 },
    "Pagadian City": { lat: 7.8257, lng: 123.4370 },
    "Surigao City": { lat: 9.7842, lng: 125.4888 },
    "Koronadal City": { lat: 6.5031, lng: 124.8469 },
    "Bislig City": { lat: 8.2153, lng: 126.3166 }
};

let parcels = [];
let customLocations = loadCustomLocations();
let selectedParcel = null;
let map;
let streetLayer;
let satelliteLayer;
let markerLayer;
let routeLayer;
let displayRequest = 0;

const weatherCache = new Map();
const WEATHER_CACHE_TIME = 5 * 60 * 1000;

function normalizeStatus(status) {
    const value = String(status || "").toLowerCase();

    if (value === "delivered") return "Delivered";
    if (value === "in transit" || value === "transit") return "In Transit";

    return "Pending";
}

function loadCustomLocations() {
    try {
        return JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function saveCustomLocations() {
    localStorage.setItem(
        LOCATION_STORAGE_KEY,
        JSON.stringify(customLocations)
    );
}

function loadParcels() {
    const samples = [
        {
            tracking: "MND123456789",
            origin: "Davao City",
            destination: "Iligan City",
            status: "In Transit",
            sample: true
        },
        {
            tracking: "MND987654321",
            origin: "Cagayan de Oro",
            destination: "Butuan City",
            status: "Pending",
            sample: true
        },
        {
            tracking: "MND555666777",
            origin: "General Santos City",
            destination: "Davao City",
            status: "Delivered",
            sample: true
        }
    ];

    try {
        const saved = localStorage.getItem(PARCEL_STORAGE_KEY);
        parcels = saved === null ? samples : JSON.parse(saved);

        if (!Array.isArray(parcels)) parcels = samples;
    } catch {
        parcels = samples;
    }

    parcels = parcels.map(parcel => ({
        ...parcel,
        status: normalizeStatus(parcel.status)
    }));

    saveParcels();
}

function saveParcels() {
    try {
        localStorage.setItem(PARCEL_STORAGE_KEY, JSON.stringify(parcels));
    } catch (error) {
        console.error(error);
        showNotification("Unable to save parcel records.", "error");
    }
}

/* NOTIFICATIONS */

function showNotification(message, type = "info", title = "") {
    const container = document.getElementById("notification-container");
    if (!container) return;

    const icons = {
        success: "✓",
        error: "✕",
        warning: "⚠",
        info: "ℹ"
    };

    const headings = {
        success: "Success",
        error: "Error",
        warning: "Warning",
        info: "Information"
    };

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;

    const icon = document.createElement("span");
    icon.className = "notification-icon";
    icon.textContent = icons[type] || icons.info;

    const content = document.createElement("div");
    content.className = "notification-content";

    const heading = document.createElement("strong");
    heading.textContent = title || headings[type] || "Notification";

    const text = document.createElement("p");
    text.textContent = message;

    const close = document.createElement("button");
    close.className = "notification-close";
    close.textContent = "×";
    close.type = "button";
    close.setAttribute("aria-label", "Close notification");

    content.append(heading, text);
    notification.append(icon, content, close);
    container.appendChild(notification);

    const timer = setTimeout(() => notification.remove(), 6500);

    close.addEventListener("click", () => {
        clearTimeout(timer);
        notification.remove();
    });
}

/* API KEY */

function getApiKey() {
    return localStorage.getItem(API_STORAGE_KEY) || "";
}

function initializeApiSettings() {
    const form = document.getElementById("api-key-form");
    const input = document.getElementById("api-key-input");
    const toggle = document.getElementById("toggle-api-key");
    const remove = document.getElementById("remove-api-key");
    const message = document.getElementById("api-key-message");

    input.value = getApiKey();

    form.addEventListener("submit", event => {
        event.preventDefault();

        const key = input.value.trim();

        if (!key) {
            message.textContent = "Please enter an API key.";
            message.className = "form-message error";
            return;
        }

        localStorage.setItem(API_STORAGE_KEY, key);
        weatherCache.clear();

        message.textContent = "API key saved successfully.";
        message.className = "form-message success";

        showNotification("OpenWeather API key saved.", "success");
        loadAllWeather();
        updateSelectedWeather();
    });

    toggle.addEventListener("click", () => {
        const hidden = input.type === "password";
        input.type = hidden ? "text" : "password";
        toggle.textContent = hidden ? "Hide" : "Show";
    });

    remove.addEventListener("click", () => {
        localStorage.removeItem(API_STORAGE_KEY);
        input.value = "";
        weatherCache.clear();

        message.textContent = "API key removed.";
        message.className = "form-message success";

        resetWeatherDisplays();
        showNotification("Weather API key removed.", "warning");
    });
}

/* MAP */

function initializeMap() {
    map = L.map("map", {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView([7.9, 125.0], 7);

    streetLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19
        }
    );

    satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            attribution: "Tiles &copy; Esri",
            maxZoom: 19
        }
    );

    satelliteLayer.addTo(map);

    markerLayer = L.layerGroup().addTo(map);
    routeLayer = L.layerGroup().addTo(map);

    document.getElementById("street-mode").addEventListener("click", () => {
        map.removeLayer(satelliteLayer);
        streetLayer.addTo(map);
        setMapMode("street");
    });

    document.getElementById("satellite-mode").addEventListener("click", () => {
        map.removeLayer(streetLayer);
        satelliteLayer.addTo(map);
        setMapMode("satellite");
    });

    window.addEventListener("resize", () => {
        setTimeout(() => map.invalidateSize(), 150);
    });

    if ("ResizeObserver" in window) {
        new ResizeObserver(() => map.invalidateSize())
            .observe(document.getElementById("map"));
    }
}

function setMapMode(mode) {
    document.getElementById("street-mode").classList.toggle(
        "active", mode === "street"
    );

    document.getElementById("satellite-mode").classList.toggle(
        "active", mode === "satellite"
    );
}

/* LOCATIONS */

function findLocation(name) {
    const all = { ...locations, ...customLocations };

    if (all[name]) return all[name];

    const key = Object.keys(all).find(
        item => item.toLowerCase() === String(name).toLowerCase()
    );

    return key ? all[key] : null;
}

async function geocodeLocation(place) {
    const params = new URLSearchParams({
        q: `${place}, Mindanao, Philippines`,
        format: "jsonv2",
        limit: "1",
        countrycodes: "ph",
        viewbox: "121.8,10.1,127.9,4.4",
        bounded: "1"
    });

    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { Accept: "application/json" } }
    );

    if (!response.ok) {
        throw new Error("Location search service is unavailable.");
    }

    const results = await response.json();

    if (!results.length) {
        throw new Error(`Location "${place}" was not found in the search area.`);
    }

    const result = results[0];

    const coordinates = {
        lat: Number(result.lat),
        lng: Number(result.lon),
        displayName: result.display_name
    };

    if (!Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) {
        throw new Error("Invalid location coordinates.");
    }

    customLocations[place] = coordinates;
    saveCustomLocations();

    return coordinates;
}

async function resolveLocation(place) {
    return findLocation(place) || await geocodeLocation(place);
}

/* ROUTE */

function createParcelRoute(parcel) {
    const origin = findLocation(parcel.origin);
    const destination = findLocation(parcel.destination);

    if (!origin || !destination) return [];

    const route = [{
        name: parcel.origin,
        ...origin,
        type: "origin"
    }];

    const originIsHub = parcel.origin.toLowerCase().includes("manolo fortich");
    const destinationIsHub = parcel.destination.toLowerCase().includes("manolo fortich");

    if (!originIsHub && !destinationIsHub) {
        route.push({
            name: HUB.name,
            lat: HUB.lat,
            lng: HUB.lng,
            type: "hub"
        });
    }

    route.push({
        name: parcel.destination,
        ...destination,
        type: "destination"
    });

    return route;
}

function markerIcon(type) {
    const colors = {
        origin: "#2689ff",
        hub: "#ffad39",
        destination: "#19dc91"
    };

    const color = colors[type] || "#2689ff";

    return L.divIcon({
        className: "parcel-marker",
        html: `<div style="
            width:19px;height:19px;border-radius:50%;
            background:${color};border:3px solid white;
            box-shadow:0 0 12px ${color};
        "></div>`,
        iconSize: [19, 19],
        iconAnchor: [9, 9]
    });
}

function updateMap(route, roadCoordinates = null) {
    markerLayer.clearLayers();
    routeLayer.clearLayers();

    if (!route.length) return;

    const points = [];

    route.forEach(point => {
        const marker = L.marker(
            [point.lat, point.lng],
            { icon: markerIcon(point.type) }
        ).addTo(markerLayer);

        const popup = document.createElement("div");
        popup.textContent = `${point.name} — Open marker for weather`;
        marker.bindPopup(popup);

        marker.on("popupopen", async () => {
            popup.textContent = `${point.name} — Loading weather...`;

            try {
                const weather = await getWeather(point.lat, point.lng);

                popup.textContent = weather
                    ? `${point.name} | ${Math.round(weather.main.temp)}°C | ${weather.weather[0].description}`
                    : `${point.name} | Add an API key to view weather`;
            } catch {
                popup.textContent = `${point.name} | Weather unavailable`;
            }
        });

        points.push([point.lat, point.lng]);
    });

    if (roadCoordinates?.length) {
        L.polyline(roadCoordinates, {
            color: "#12dfff",
            weight: 5,
            opacity: 0.95
        }).addTo(routeLayer);
    } else if (points.length > 1) {
        L.polyline(points, {
            color: "#12dfff",
            weight: 4,
            dashArray: "8, 10"
        }).addTo(routeLayer);
    }

    const bounds = L.latLngBounds(points);

    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 10 });
    }
}

/* DISTANCE AND ETA */

function haversineDistance(a, b) {
    const earth = 6371;
    const rad = Math.PI / 180;

    const lat1 = a.lat * rad;
    const lat2 = b.lat * rad;
    const deltaLat = (b.lat - a.lat) * rad;
    const deltaLng = (b.lng - a.lng) * rad;

    const value =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLng / 2) ** 2;

    return earth * 2 * Math.atan2(
        Math.sqrt(value),
        Math.sqrt(1 - value)
    );
}

function formatDuration(seconds) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    if (!hours) return `${remaining} min`;
    if (!remaining) return `${hours} hr`;

    return `${hours} hr ${remaining} min`;
}

async function calculateRoadRoute(route) {
    const coordinates = route
        .map(point => `${point.lng},${point.lat}`)
        .join(";");

    const url =
        `https://router.project-osrm.org/route/v1/driving/${coordinates}` +
        "?overview=full&geometries=geojson";

    const response = await fetch(url);

    if (!response.ok) throw new Error("Routing service unavailable.");

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes?.length) {
        throw new Error("No road route found.");
    }

    const result = data.routes[0];

    return {
        distance: result.distance / 1000,
        duration: result.duration,
        coordinates: result.geometry.coordinates.map(
            coordinate => [coordinate[1], coordinate[0]]
        ),
        estimated: false
    };
}

function fallbackRoute(route) {
    let distance = 0;

    for (let i = 0; i < route.length - 1; i++) {
        distance += haversineDistance(route[i], route[i + 1]);
    }

    const estimatedDistance = distance * 1.35;
    const duration = estimatedDistance / 40 * 3600;

    return {
        distance: estimatedDistance,
        duration,
        coordinates: null,
        estimated: true
    };
}

async function calculateRoute(route) {
    try {
        return await calculateRoadRoute(route);
    } catch (error) {
        console.warn(error);
        return fallbackRoute(route);
    }
}

function displayRouteMetrics(result, status) {
    document.getElementById("route-distance").textContent =
        `${result.distance.toFixed(1)} km`;

    document.getElementById("route-distance-note").textContent =
        result.estimated
            ? "Approximate road-distance estimate"
            : "Calculated using road routing";

    if (status === "Delivered") {
        document.getElementById("route-eta").textContent = "Delivered";
        document.getElementById("route-eta-note").textContent =
            "Parcel marked as delivered";
        return;
    }

    const duration = formatDuration(result.duration);
    const arrival = new Date(Date.now() + result.duration * 1000);

    document.getElementById("route-eta").textContent =
        arrival.toLocaleString("en-PH", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });

    document.getElementById("route-eta-note").textContent =
        `Approx. ${duration} • ${result.estimated ? "Fallback estimate" : "Driving time estimate"}`;
}

/* TIMELINE */

function updateTimeline(route, status) {
    const container = document.getElementById("route-track");
    container.replaceChildren();

    if (!route.length) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No route available.";
        container.appendChild(empty);
        return;
    }

    const normalized = normalizeStatus(status);

    let completed = 1;

    if (normalized === "In Transit") completed = Math.min(2, route.length);
    if (normalized === "Delivered") completed = route.length;

    const labels = route.map((point, index) => {
        if (index === 0) return "Parcel Picked Up";
        if (index === route.length - 1) return "Destination";
        return "Sorting Hub";
    });

    route.forEach((point, index) => {
        const step = document.createElement("div");
        step.className = "timeline-step";

        if (index < completed) step.classList.add("completed");

        const dot = document.createElement("div");
        dot.className = "timeline-dot";

        const name = document.createElement("strong");
        name.textContent = labels[index];

        const place = document.createElement("small");
        place.textContent = point.name;

        const statusText = document.createElement("small");
        statusText.textContent = index < completed
            ? "Completed"
            : "Pending";

        step.append(dot, name, place, statusText);
        container.appendChild(step);
    });
}

/* SELECT PARCEL */

async function displayParcel(parcel) {
    if (!parcel) return;

    const request = ++displayRequest;
    selectedParcel = parcel;

    document.getElementById("tracking-code").textContent = parcel.tracking;
    document.getElementById("shipment-status").textContent = parcel.status;
    document.getElementById("origin-location").textContent = parcel.origin;
    document.getElementById("destination-location").textContent = parcel.destination;

    const route = createParcelRoute(parcel);

    document.getElementById("next-location").textContent =
        route.length > 1 ? route[1].name : parcel.destination;

    updateTimeline(route, parcel.status);
    updateMap(route);

    document.getElementById("route-distance").textContent = "Calculating...";
    document.getElementById("route-eta").textContent = "Calculating...";

    if (!route.length) {
        document.getElementById("route-distance").textContent = "Unavailable";
        document.getElementById("route-eta").textContent = "Unavailable";
        return;
    }

    const result = await calculateRoute(route);

    if (request !== displayRequest) return;

    displayRouteMetrics(result, parcel.status);

    if (result.coordinates) {
        updateMap(route, result.coordinates);
    }

    await updateSelectedWeather();
}

/* SEARCH */

function initializeTrackingSearch() {
    document.getElementById("track-form").addEventListener("submit", async event => {
        event.preventDefault();

        const query = document.getElementById("tracking-number").value
            .trim().toLowerCase();

        const parcel = parcels.find(item =>
            item.tracking.toLowerCase() === query ||
            item.origin.toLowerCase().includes(query) ||
            item.destination.toLowerCase().includes(query)
        );

        const message = document.getElementById("form-message");

        if (!parcel) {
            message.textContent = "No matching parcel found.";
            message.className = "form-message error";
            showNotification("No parcel matches your search.", "error");
            return;
        }

        message.textContent = `Parcel ${parcel.tracking} found.`;
        message.className = "form-message success";

        await displayParcel(parcel);
    });
}

/* ADD PARCEL */

function initializeAddParcel() {
    const form = document.getElementById("add-parcel-form");
    const button = document.getElementById("add-parcel-button");
    const message = document.getElementById("add-parcel-message");

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const tracking = document.getElementById("new-tracking-number")
            .value.trim().toUpperCase();

        const originName = document.getElementById("parcel-origin")
            .value.trim();

        const destinationName = document.getElementById("parcel-destination")
            .value.trim();

        const status = normalizeStatus(
            document.getElementById("parcel-status").value
        );

        if (!tracking || !originName || !destinationName) return;

        if (parcels.some(parcel => parcel.tracking === tracking)) {
            message.textContent = "Tracking number already exists.";
            message.className = "form-message error";
            return;
        }

        if (originName.toLowerCase() === destinationName.toLowerCase()) {
            message.textContent = "Origin and destination must be different.";
            message.className = "form-message error";
            return;
        }

        button.disabled = true;
        button.textContent = "Finding locations...";

        try {
            const [origin, destination] = await Promise.all([
                resolveLocation(originName),
                resolveLocation(destinationName)
            ]);

            if (origin.lat === destination.lat && origin.lng === destination.lng) {
                throw new Error("Origin and destination cannot be the same.");
            }

            const parcel = {
                tracking,
                origin: originName,
                destination: destinationName,
                status,
                sample: false,
                createdAt: new Date().toISOString()
            };

            parcels.push(parcel);
            saveParcels();
            renderParcelList();
            updateStats();

            form.reset();
            message.textContent = "Parcel successfully registered.";
            message.className = "form-message success";

            showNotification(
                `Parcel ${tracking} has been registered.`,
                "success",
                "Parcel Added"
            );

            await displayParcel(parcel);

        } catch (error) {
            message.textContent = error.message || "Unable to add parcel.";
            message.className = "form-message error";

            showNotification(
                error.message || "Unable to register parcel.",
                "error"
            );
        } finally {
            button.disabled = false;
            button.textContent = "+ Register Parcel";
        }
    });
}

/* PARCEL TABLE */

function renderParcelList() {
    const container = document.getElementById("parcel-list");
    container.replaceChildren();

    if (!parcels.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = "No parcels registered.";
        row.appendChild(cell);
        container.appendChild(row);
        return;
    }

    parcels.forEach(parcel => {
        const row = document.createElement("tr");

        const values = [
            parcel.tracking,
            parcel.origin,
            parcel.destination
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");

        badge.className = "status-pill " +
            (parcel.status === "Delivered"
                ? "status-delivered"
                : parcel.status === "In Transit"
                    ? "status-transit"
                    : "status-pending");

        badge.textContent = parcel.status;
        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        const actionCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "table-action";

        const view = document.createElement("button");
        view.className = "view-btn";
        view.textContent = "View";
        view.type = "button";
        view.addEventListener("click", async () => {
            await displayParcel(parcel);
            document.getElementById("dashboard").scrollIntoView({
                behavior: "smooth"
            });
        });

        const remove = document.createElement("button");
        remove.className = "delete-btn";
        remove.textContent = "Delete";
        remove.type = "button";
        remove.addEventListener("click", () => deleteParcel(parcel.tracking));

        actions.append(view, remove);
        actionCell.appendChild(actions);
        row.appendChild(actionCell);

        container.appendChild(row);
    });
}

/* DELETE */

function deleteParcel(tracking) {
    if (!confirm(`Delete parcel ${tracking}?`)) return;

    parcels = parcels.filter(parcel => parcel.tracking !== tracking);
    saveParcels();
    renderParcelList();
    updateStats();

    if (selectedParcel?.tracking === tracking) {
        selectedParcel = null;
        displayRequest++;

        document.getElementById("tracking-code").textContent = "Select a parcel";
        document.getElementById("shipment-status").textContent = "---";
        document.getElementById("origin-location").textContent = "---";
        document.getElementById("next-location").textContent = "---";
        document.getElementById("destination-location").textContent = "---";
        document.getElementById("route-distance").textContent = "---";
        document.getElementById("route-eta").textContent = "---";
        document.getElementById("route-track").innerHTML =
            '<p class="empty-state">Select a parcel to view its delivery timeline.</p>';

        markerLayer.clearLayers();
        routeLayer.clearLayers();
        resetWeatherDisplays();
    }

    showNotification(`Parcel ${tracking} deleted.`, "success");
}

/* STATISTICS */

function updateStats() {
    document.getElementById("total-parcels").textContent = parcels.length;

    document.getElementById("transit-parcels").textContent =
        parcels.filter(p => p.status === "In Transit").length;

    document.getElementById("delivered-parcels").textContent =
        parcels.filter(p => p.status === "Delivered").length;

    document.getElementById("pending-parcels").textContent =
        parcels.filter(p => p.status === "Pending").length;
}

/* WEATHER */

function weatherEmoji(icon = "") {
    if (icon.startsWith("01")) return "☀️";
    if (icon.startsWith("02")) return "🌤️";
    if (icon.startsWith("03") || icon.startsWith("04")) return "☁️";
    if (icon.startsWith("09") || icon.startsWith("10")) return "🌧️";
    if (icon.startsWith("11")) return "⛈️";
    return "🌥️";
}

async function getWeather(lat, lng) {
    const key = getApiKey();
    if (!key) return null;

    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const cached = weatherCache.get(cacheKey);

    if (cached && Date.now() - cached.time < WEATHER_CACHE_TIME) {
        return cached.data;
    }

    const params = new URLSearchParams({
        lat,
        lon: lng,
        appid: key,
        units: "metric"
    });

    const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?${params}`
    );

    if (!response.ok) {
        if (response.status === 401) throw new Error("Invalid OpenWeather API key.");
        throw new Error("Weather service unavailable.");
    }

    const data = await response.json();

    weatherCache.set(cacheKey, {
        time: Date.now(),
        data
    });

    return data;
}

function resetWeatherDisplays() {
    document.getElementById("destination-temperature").textContent = "--°C";
    document.getElementById("destination-description").textContent = "Weather unavailable";
    document.getElementById("destination-humidity").textContent = "--%";
    document.getElementById("destination-wind").textContent = "-- m/s";
    document.getElementById("destination-rain").textContent = "-- mm";

    document.querySelector(".weather-big-icon").textContent = "🌤️";

    [
        "weather-davao",
        "weather-manolo",
        "weather-cdo",
        "weather-iligan"
    ].forEach(id => {
        const element = document.getElementById(id);
        element.innerHTML = `<h3>${element.querySelector("h3")?.textContent || "Weather"}</h3><p>Weather unavailable. Add an API key.</p>`;
    });
}

function displayDestinationWeather(data) {
    if (!data) {
        resetWeatherDisplays();
        return;
    }

    document.getElementById("destination-temperature").textContent =
        `${Math.round(data.main.temp)}°C`;

    document.getElementById("destination-description").textContent =
        data.weather?.[0]?.description || "Unknown conditions";

    document.getElementById("destination-humidity").textContent =
        `${data.main.humidity}%`;

    document.getElementById("destination-wind").textContent =
        `${data.wind?.speed ?? 0} m/s`;

    document.getElementById("destination-rain").textContent =
        `${data.rain?.["1h"] ?? data.rain?.["3h"] ?? 0} mm`;

    document.querySelector(".weather-big-icon").textContent =
        weatherEmoji(data.weather?.[0]?.icon);
}

async function updateSelectedWeather() {
    if (!selectedParcel) return;

    const destination = findLocation(selectedParcel.destination);
    if (!destination) return;

    try {
        const data = await getWeather(destination.lat, destination.lng);
        displayDestinationWeather(data);
    } catch (error) {
        console.error(error);
        resetWeatherDisplays();
    }
}

const weatherLocations = [
    { id: "weather-davao", name: "Davao City", lat: 7.1907, lng: 125.4553 },
    { id: "weather-manolo", name: "Manolo Fortich", lat: 8.3695, lng: 124.8658 },
    { id: "weather-cdo", name: "Cagayan de Oro", lat: 8.4542, lng: 124.6319 },
    { id: "weather-iligan", name: "Iligan City", lat: 8.2280, lng: 124.2452 }
];

function renderWeatherCard(location, data) {
    const card = document.getElementById(location.id);
    card.replaceChildren();

    const title = document.createElement("h3");
    title.textContent = location.name;

    const temperature = document.createElement("p");
    temperature.className = "weather-temp";
    temperature.textContent = `${Math.round(data.main.temp)}°C`;

    const description = document.createElement("p");
    description.textContent =
        `${weatherEmoji(data.weather?.[0]?.icon)} ${data.weather?.[0]?.description || "Unknown"}`;

    const humidity = document.createElement("p");
    humidity.textContent = `Humidity: ${data.main.humidity}%`;

    const wind = document.createElement("p");
    wind.textContent = `Wind: ${data.wind?.speed ?? 0} m/s`;

    card.append(title, temperature, description, humidity, wind);
}

async function loadAllWeather() {
    if (!getApiKey()) {
        resetWeatherDisplays();
        document.getElementById("weather-updated").textContent =
            "Add your OpenWeather API key to activate monitoring.";

        document.getElementById("top-weather-description").textContent =
            "Weather unavailable";

        return;
    }

    const results = await Promise.allSettled(
        weatherLocations.map(async location => ({
            location,
            data: await getWeather(location.lat, location.lng)
        }))
    );

    let firstWeather = null;

    results.forEach(result => {
        if (result.status === "fulfilled" && result.value.data) {
            renderWeatherCard(result.value.location, result.value.data);

            if (!firstWeather) firstWeather = result.value.data;
        }
    });

    if (firstWeather) {
        document.getElementById("top-temperature").textContent =
            `${Math.round(firstWeather.main.temp)}°C`;

        document.getElementById("top-weather-description").textContent =
            firstWeather.weather?.[0]?.description || "Current conditions";
    }

    document.getElementById("weather-updated").textContent =
        `Last updated: ${new Date().toLocaleString()}`;
}

/* CLOCK AND NAVIGATION */

function updateClock() {
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

function initializeNavigation() {
    const sidebar = document.getElementById("sidebar");

    document.getElementById("menu-toggle").addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".nav-link").forEach(item =>
                item.classList.remove("active")
            );

            link.classList.add("active");
            sidebar.classList.remove("open");
        });
    });

    document.getElementById("refresh-parcels").addEventListener("click", () => {
        renderParcelList();
        updateStats();
        showNotification("Parcel records refreshed.", "success");
    });

    document.getElementById("refresh-weather").addEventListener("click", async () => {
        weatherCache.clear();
        await loadAllWeather();
        await updateSelectedWeather();
        showNotification("Weather information refreshed.", "success");
    });
}

/* INITIALIZE */

function initializeWebsite() {
    loadParcels();

    initializeMap();
    initializeApiSettings();
    initializeTrackingSearch();
    initializeAddParcel();
    initializeNavigation();

    renderParcelList();
    updateStats();
    updateClock();

    setInterval(updateClock, 60000);

    if (parcels.length) {
        displayParcel(parcels[0]);
    }

    loadAllWeather();

    showNotification(
        "Mindanao Parcel Tracker is ready.",
        "success",
        "System Online"
    );
}

document.addEventListener("DOMContentLoaded", initializeWebsite);
