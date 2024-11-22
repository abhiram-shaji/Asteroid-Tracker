# Asteroid Tracker

A simple web app that tracks Near-Earth Objects (NEOs) using Leaflet.js, OpenStreetMap, and NASA's NeoWs API. This app is designed for anyone interested in observing asteroids that come close to Earth, providing real-time data in a visual, map-based format.

## Features

- **Map View**: An interactive map that shows NEOs on their closest approach path to Earth.
- **Date Range Selection**: Users can select a date range to view upcoming NEOs within that period.
- **Filters**: Allows filtering NEOs by size and distance for more customized viewing.
- **Detailed Popups**: Click on a NEO marker to see detailed information, like its name, size, speed, and closest distance to Earth.
- **Loading and Error Messages**: User-friendly messages to show loading status or display errors.

## Code Overview

The app's main functions are as follows:

### 1. `initializeMap`
   - Sets up the initial map view using Leaflet.js and OpenStreetMap tiles. Centers the map and prepares it to display NEO data.

### 2. `fetchNEOs`
   - Retrieves a list of NEOs within a specified date range by calling the NeoWs API’s `/feed` endpoint. This function pulls data that will be used to place markers on the map.

### 3. `displayNEOsOnMap`
   - Adds map markers for each NEO, displaying its location and initial details. Each marker can be clicked to open a popup with the NEO's name and size.

### 4. `fetchNEODetails`
   - Gets more specific details about a selected NEO, such as speed and hazard status, and updates the marker’s popup with this data. This is triggered when a user clicks on a marker.

### 5. `applyFilters`
   - Filters NEO data based on minimum size and maximum distance chosen by the user. This ensures only NEOs meeting the selected criteria are shown.

### 6. `handleUserInput`
   - Processes user inputs for date range and filters, then fetches and displays relevant NEOs on the map.

### 7. `showLoading` and `showError`
   - Provides feedback to the user while data is loading or if there’s an error in fetching data.

## How to Use

1. **Select Dates**: Use the date range selector to choose the period for which you want to see NEOs.
2. **Apply Filters**: Adjust the size and distance filters to refine the list of NEOs displayed.
3. **View Details**: Click on a marker to see detailed information about a specific NEO.

## Technologies Used

- **Leaflet.js**: For interactive maps.
- **OpenStreetMap**: Provides the base map tiles.
- **NASA NeoWs API**: Supplies real-time data on Near-Earth Objects.

## Complete Example

### Initialization and Helper Functions

1. **Initialize Map**: Sets up an interactive map centered on latitude 20 and longitude 0.
   ```javascript
   const neoMap = L.map('neoMap').setView([20, 0], 2);
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
   }).addTo(neoMap);
   let markers = [];
   ```

2. **Show and Hide Messages**: Functions to manage loading, error, and no-results messages.
   ```javascript
   function showLoading() { /* ... */ }
   function showError(errorText) { /* ... */ }
   function showNoResults() { /* ... */ }
   function hideMessages() { /* ... */ }
   ```

3. **Clear Markers and Adjust Date Range**: Functions to clear existing map markers and adjust the end date.
   ```javascript
   function clearMarkers() { markers.forEach(marker => neoMap.removeLayer(marker)); markers = []; }
   function adjustEndDate(startDate) { /* Returns adjusted end date */ }
   ```

4. **Hash and Modulus Functions**: Used for generating unique coordinates for NEOs.
   ```javascript
   function hashCode(str) { /* Returns a hash code */ }
   function mod(n, m) { return ((n % m) + m) % m; }
   ```

### Fetching and Displaying NEOs

1. **Apply Filters**: Filters NEOs based on user-defined size and distance.
   ```javascript
   function applyFilters(neos, minSize, maxSize, minDistance, maxDistance) {
     return neos.filter(neo => {
       const diameter = neo.estimated_diameter.kilometers.estimated_diameter_min;
       const distance = neo.close_approach_data[0].miss_distance.kilometers;
       return diameter >= minSize && diameter <= maxSize && distance >= minDistance && distance <= maxDistance;
     });
   }
   ```

2. **Fetch NEOs**: Retrieves NEOs within the specified date range and applies filters.
   ```javascript
   function fetchNEOs(startDate, endDate, minSize, maxSize, minDistance, maxDistance) {
     showLoading();
     clearMarkers();
     const adjustedEndDate = adjustEndDate(startDate);
     const finalEndDate = new Date(endDate) > new Date(adjustedEndDate) ? adjustedEndDate : endDate;

     fetch(`${apiUrl}/feed?start_date=${startDate}&end_date=${finalEndDate}&api_key=${apiKey}`)
       .then(response => response.json())
       .then(data => {
         const allNEOs = Object.values(data.near_earth_objects).flat();
         const filteredNEOs = applyFilters(allNEOs, minSize, maxSize, minDistance, maxDistance);
         if (filteredNEOs.length === 0) showNoResults();
         else displayNEOsOnMap(filteredNEOs);
         hideMessages();
       })
       .catch(() => showError("An error occurred while fetching data."));
   }
   ```

3. **Display NEOs on Map**: Places markers on the map for each NEO, with initial details in popups.
   ```javascript
   function displayNEOsOnMap(neos) {
     neos.forEach(neo => {
       const lat = (mod(hashCode(neo.id), 180) - 90).toFixed(2);
       const lon = (mod(hashCode(neo.name || neo.id + 'lon'), 360) - 180).toFixed(2);

       const marker = L.marker([lat, lon]).addTo(neoMap);
       marker.bindPopup(`
         <strong>${neo.name}</strong><br>
         <strong>Approach Date:</strong> ${neo.close_approach_data[0].close_approach_date}<br>
         <strong>Distance:</strong> ${neo.close_approach_data[0].miss_distance.kilometers} km<br>
         <strong>Velocity:</strong> ${neo.close_approach_data[0].relative_velocity.kilometers_per_hour} km/h
       `);
       markers.push(marker);
       marker.on('click', () => fetchNEODetails(neo.id, marker));
     });
   }
   ```

4. **Fetch Detailed NEO Information**: Fetches more details for an NEO when its marker is clicked.
   ```javascript
   function fetchNEODetails(neoId, marker) {
     fetch(`${apiUrl}/neo/${neoId}?api_key=${apiKey}`)
       .then(response => response.json())
       .then(details => {
         marker.setPopupContent(`
           <strong>${details.name}</strong><br>
           <strong>Size:</strong> ${details.estimated_diameter.kilometers.estimated_diameter_min.toFixed(2)} - ${details.estimated_diameter.kilometers.estimated_diameter_max.toFixed(2)} km<br>
           <strong>Hazardous:</strong> ${details.is_potentially_hazardous_asteroid ? 'Yes' : 'No'}
         `);
       });
   }
   ```

### Handling User Input and Submitting the Form

1. **Form Submission**: Processes user inputs for date range and filters, then fetches and displays relevant NEOs.
   ```javascript
   document.getElementById('dateForm').addEventListener('submit', function (event) {
     event.preventDefault();
     const startDate = document.getElementById('startDate').value;
     const endDate = document.getElementById('endDate').value;
     const minSize = parseFloat(document.getElementById('minSize').value) || 0;
     const maxSize = parseFloat(document.getElementById('maxSize').value) || Infinity;
     const minDistance = parseFloat(document.getElementById('minDistance').value) || 0;
     const maxDistance = parseFloat(document.getElementById('maxDistance').value) || Infinity;

     if (startDate && endDate) {
       fetchNEOs(startDate, endDate, minSize, maxSize, minDistance, maxDistance);
     } else {
       showError("Please enter a valid date range.");
     }
   });
   ```



Thank you,
Abhiram Shaji