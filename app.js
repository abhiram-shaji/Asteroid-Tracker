const apiUrl = 'https://api.nasa.gov/neo/rest/v1';
const apiKey = 'S8qDXmGinppMem5pWQww6keZefgVtXG5WZSGNQIt';

console.log("Starting NEO Tracker application...");

// Initialize map
const neoMap = L.map('neoMap').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(neoMap);
console.log("Map initialized.");

let markers = []; // Array to keep track of all markers on the map

// Display loading message
function showLoading() {
  document.getElementById("loadingMessage").style.display = "block";
  document.getElementById("errorMessage").style.display = "none";
  document.getElementById("noResultsMessage").style.display = "none";
}

// Display error message
function showError(errorText) {
  const errorMessage = document.getElementById("errorMessage");
  errorMessage.textContent = errorText;
  errorMessage.style.display = "block";
  document.getElementById("loadingMessage").style.display = "none";
  document.getElementById("noResultsMessage").style.display = "none";
}

// Display "no results" message
function showNoResults() {
  document.getElementById("noResultsMessage").style.display = "block";
  document.getElementById("loadingMessage").style.display = "none";
  document.getElementById("errorMessage").style.display = "none";
}

// Hide all messages
function hideMessages() {
  document.getElementById("loadingMessage").style.display = "none";
  document.getElementById("errorMessage").style.display = "none";
  document.getElementById("noResultsMessage").style.display = "none";
}

// Clear all markers from the map
function clearMarkers() {
  markers.forEach(marker => neoMap.removeLayer(marker));
  markers = []; // Reset the markers array
}

// Helper function to adjust end date if it exceeds the 7-day limit
function adjustEndDate(startDate) {
  const start = new Date(startDate);
  const adjustedEnd = new Date(start);
  adjustedEnd.setDate(start.getDate() + 7);
  console.log(`Adjusted end date: ${adjustedEnd.toISOString().split('T')[0]}`);
  return adjustedEnd.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// Hash function to generate a consistent number from a string
function hashCode(str) {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    let chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

// Custom modulus function that handles negative numbers
function mod(n, m) {
  return ((n % m) + m) % m;
}

// Filter NEOs based on min and max size, and min and max distance
function applyFilters(neos, minSize, maxSize, minDistance, maxDistance) {
  console.log("Applying filters:", { minSize, maxSize, minDistance, maxDistance });
  const filtered = neos.filter((neo) => {
    const diameter = neo.estimated_diameter.kilometers.estimated_diameter_min;
    const distance = neo.close_approach_data[0].miss_distance.kilometers;
    return (
      diameter >= minSize &&
      diameter <= maxSize &&
      distance >= minDistance &&
      distance <= maxDistance
    );
  });
  console.log(`Filtered ${filtered.length} NEOs based on size and distance.`);
  return filtered;
}

// Fetch NEOs based on selected date range with adjusted end date if needed
function fetchNEOs(startDate, endDate, minSize, maxSize, minDistance, maxDistance) {
  console.log("Fetching NEOs with dates:", { startDate, endDate });
  showLoading(); // Show loading message before making the request
  clearMarkers(); // Clear previous markers before adding new ones
  const adjustedEndDate = adjustEndDate(startDate);
  const finalEndDate = new Date(endDate) > new Date(adjustedEndDate) ? adjustedEndDate : endDate;
  console.log(`Final end date used for API request: ${finalEndDate}`);

  const url = `${apiUrl}/feed?start_date=${startDate}&end_date=${finalEndDate}&api_key=${apiKey}`;
  console.log("API URL:", url);

  fetch(url)
    .then((response) => {
      console.log("API response received.");
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Data received from API:", data);
      if (!data.near_earth_objects) throw new Error("No NEO data found.");
      const allNEOs = Object.values(data.near_earth_objects).flat();
      console.log(`Total NEOs retrieved: ${allNEOs.length}`);
      const filteredNEOs = applyFilters(allNEOs, minSize, maxSize, minDistance, maxDistance);

      if (filteredNEOs.length === 0) {
        // If no NEOs match the filters, show "no results" message
        showNoResults();
      } else {
        displayNEOsOnMap(filteredNEOs);
        hideMessages(); // Hide messages once data is displayed
      }
    })
    .catch((error) => {
      console.error('Error fetching NEO data:', error);
      showError("An error occurred while fetching data. Please try again."); // Show error message
    });
}

// Fetch detailed NEO data when marker is clicked
function fetchNEODetails(neoId, marker, initialContent) {
  const url = `${apiUrl}/neo/${neoId}?api_key=${apiKey}`;
  console.log("Fetching details for NEO ID:", neoId);
  fetch(url)
    .then((response) => response.json())
    .then((details) => {
      console.log("Details received for NEO:", details);
      const size = details.estimated_diameter.kilometers;
      const isHazardous = details.is_potentially_hazardous_asteroid ? 'Yes' : 'No';

      marker.setPopupContent(`
        ${initialContent}
        <strong>Size:</strong> ${size.estimated_diameter_min.toFixed(2)} - ${size.estimated_diameter_max.toFixed(2)} km<br>
        <strong>Hazardous:</strong> ${isHazardous}
      `);
    })
    .catch((error) => console.error('Error fetching NEO details:', error));
}

// Display NEOs on the map with independent positions
function displayNEOsOnMap(neos) {
  console.log("Displaying NEOs on map:", neos.length);

  neos.forEach((neo) => {
    const { id, name, close_approach_data } = neo;
    const approach = close_approach_data[0];

    // Generate different hash values for latitude and longitude
    const latHash = hashCode(id);
    const lonHash = hashCode(name || id + 'lon'); // Use name or modified ID

    const lat = (mod(latHash, 180) - 90).toFixed(2); // Range -90 to +90
    const lon = (mod(lonHash, 360) - 180).toFixed(2); // Range -180 to +180

    console.log(`Placing NEO ${name} at lat: ${lat}, lon: ${lon}`);

    // Initial popup content with approach date, distance, and velocity
    const initialContent = `
      <strong>${name}</strong><br>
      <strong>Approach Date:</strong> ${approach.close_approach_date}<br>
      <strong>Distance:</strong> ${parseFloat(
        approach.miss_distance.kilometers
      ).toFixed(2)} km<br>
      <strong>Velocity:</strong> ${parseFloat(
        approach.relative_velocity.kilometers_per_hour
      ).toFixed(2)} km/h
    `;

    // Create marker for each NEO with initial popup content
    const marker = L.marker([lat, lon]).addTo(neoMap);
    marker.bindPopup(initialContent);

    // Add marker to the markers array for tracking
    markers.push(marker);

    // Fetch additional details when the marker is clicked
    marker.on('click', () => {
      console.log(`Marker clicked for NEO ${name} (ID: ${id})`);
      fetchNEODetails(id, marker, initialContent);
    });
  });
}

// Handle form submission
document.getElementById('dateForm').addEventListener('submit', function (event) {
  event.preventDefault();
  console.log("Form submitted.");
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const minSize = parseFloat(document.getElementById('minSize').value) || 0; // Default to 0 if empty
  const maxSize = parseFloat(document.getElementById('maxSize').value) || Infinity; // Default to Infinity if empty
  const minDistance = parseFloat(document.getElementById('minDistance').value) || 0; // Default to 0 if empty
  const maxDistance = parseFloat(document.getElementById('maxDistance').value) || Infinity; // Default to Infinity if empty
  console.log("Filter parameters:", { startDate, endDate, minSize, maxSize, minDistance, maxDistance });
  if (startDate && endDate) {
    fetchNEOs(startDate, endDate, minSize, maxSize, minDistance, maxDistance);
  } else {
    console.warn("Invalid date range specified.");
    showError("Please enter a valid date range.");
  }
});