import React, { useState, useEffect, useRef } from 'react';
import TrafficMap from './TrafficMap';
import PermissionDialog from './PermissionDialog';
import { indoreLocations, findNearestLocation } from '../utils/locations';
import flatpickr from 'flatpickr';

const MainContent = () => {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [activeField, setActiveField] = useState('source'); // Track which field is active
  const activeFieldRef = useRef(activeField);
  const [sourceLatLng, setSourceLatLng] = useState(null)
  const [destinationLatLng, setDestinationLatLng] = useState(null)
  const now = new Date();


  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // convert to 12-hour format
    return `${hours}:${minutes} ${ampm}`;
  };
  const [date, setDate] = useState(formatDate(now));
  const [time, setTime] = useState(formatTime(now));

  const [selectedTransport, setSelectedTransport] = useState('bike');
  const [trafficResult, setTrafficResult] = useState('');
  const [showTrafficResult, setShowTrafficResult] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(true);//Change it later
  const [routeData, setRouteData] = useState(null);
  const [showAllSegments, setShowAllSegments] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [showLocationPopup, setShowLocationPopup] = useState(false);

  useEffect(() => {
    setShowPermissionDialog(true);

    // Initialize flatpickr for date and time inputs
    flatpickr("#date", {
      dateFormat: "d-m-Y",
      onChange: (selectedDates, dateStr) => {
        setDate(dateStr.toString());
      }
    });

    flatpickr("#time", {
      enableTime: true,
      noCalendar: true,
      dateFormat: "h:i K",
      time_24hr: false,
      onChange: (selectedDates, timeStr) => {
        setTime(timeStr); // Update state when time changes
      }
    });
  }, []);

  useEffect(() => {
    activeFieldRef.current = activeField;
  }, [activeField]);

  const handlePermission = (allowed, placeName) => {
    setShowPermissionDialog(false);
    if (allowed) {
      if (placeName) setSource(placeName);
      console.log('Location permission granted');
    } else {
      alert("Location access is required for full functionality. You can enable it later in your browser settings.");
    }
  };

  const handleTransportChange = (transport) => {
    setSelectedTransport(transport);
  };

  const toISODateTime = (date, time) => {
    if (!date || !time) return new Date().toISOString();
    const [day, month, year] = date.split('-');
    let [h, minRest] = time.split(':');
    let minute = parseInt(minRest);
    let hour = parseInt(h);
    if (time.toLowerCase().includes('pm') && hour < 12) hour += 12;
    if (time.toLowerCase().includes('am') && hour === 12) hour = 0;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
  };

  const geocodePlace = async (place) => {
    // If already coordinates, return as is (this is the priority for map clicks)
    if (/^-?\d+\.\d+,-?\d+\.\d+$/.test(place.trim())) {
      const coords = place.trim();
      const [lat, lng] = coords.split(',').map(Number);
      // Validate coordinates are in Indore area
      if (lat >= 22.5 && lat <= 23.0 && lng >= 75.5 && lng <= 76.0) {
        console.log(`Using exact coordinates: ${coords}`);
        return coords;
      } else {
        throw new Error(`Coordinates ${coords} are outside Indore area. Please select a location within Indore.`);
      }
    }

    // Only check predefined locations if it's not coordinates (for dropdown/typing)
    // If in indoreLocations, return coordinates
    if (indoreLocations[place.trim()]) {
      return indoreLocations[place.trim()];
    }

    // Only check for partial matches if it's not coordinates (for dropdown/typing)
    const knownLocations = Object.keys(indoreLocations);
    for (const knownLocation of knownLocations) {
      if (place.toLowerCase().includes(knownLocation.toLowerCase())) {
        console.log(`Found matching location: ${knownLocation} in "${place}"`);
        return indoreLocations[knownLocation];
      }
    }

    // If it's a long address string (from map click), extract coordinates directly
    if (place.includes(',') && place.includes('India')) {
      // This is likely a reverse geocoded address from a map click
      // We need to get the coordinates back from this address
      try {
        const reverseUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
        const resp = await fetch(reverseUrl, { headers: { 'Accept-Language': 'en' } });
        const data = await resp.json();
        if (data && data.length > 0) {
          const result = data[0];
          // Verify it's in Indore area (roughly 22.5-23.0 lat, 75.5-76.0 lon)
          const lat = parseFloat(result.lat);
          const lon = parseFloat(result.lon);
          if (lat >= 22.5 && lat <= 23.0 && lon >= 75.5 && lon <= 76.0) {
            // console.log(`Using coordinates from address: ${lat},${lon}`);
            return `${lat},${lon}`;
          }
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error);
      }
    }

    // Try to geocode online with more specific search
    const url = `https://nominatim.openstreetmap.org/search?city=Indore&state=Madhya%20Pradesh&country=India&q=${encodeURIComponent(place)}&format=json&limit=1&addressdetails=1`;
    try {
      const resp = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await resp.json();
      if (data && data.length > 0) {
        // Accept the result if it's in Madhya Pradesh (which includes Indore)
        const result = data[0];
        if (result.address && result.address.state === 'Madhya Pradesh') {
          return `${result.lat},${result.lon}`;
        }
        // Also accept if the display name contains "Indore"
        if (result.display_name && result.display_name.toLowerCase().includes('indore')) {
          return `${result.lat},${result.lon}`;
        }
        // Accept if coordinates are in Indore area
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        if (lat >= 22.5 && lat <= 23.0 && lon >= 75.5 && lon <= 76.0) {
          return `${result.lat},${result.lon}`;
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }

    // If not found, try a broader search without city restriction
    const broadUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place + ' Indore')}&format=json&limit=1&addressdetails=1`;
    try {
      const resp = await fetch(broadUrl, { headers: { 'Accept-Language': 'en' } });
      const data = await resp.json();
      if (data && data.length > 0) {
        const result = data[0];
        // Accept if it's in Madhya Pradesh or contains Indore
        if (result.address && result.address.state === 'Madhya Pradesh') {
          return `${result.lat},${result.lon}`;
        }
        if (result.display_name && result.display_name.toLowerCase().includes('indore')) {
          return `${result.lat},${result.lon}`;
        }
        // Accept if coordinates are in Indore area
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        if (lat >= 22.5 && lat <= 23.0 && lon >= 75.5 && lon <= 76.0) {
          return `${result.lat},${result.lon}`;
        }
      }
    } catch (error) {
      console.error('Broad geocoding error:', error);
    }

    // If still not found, throw a more helpful error
    throw new Error(`Location "${place}" not found. Please click on the map to select a location or try a different location name.`);
  };

  const handleRouteRequest = async () => {
    if (!source || !destination) {
      alert("Please enter both source and destination");
      return;
    }
    setShowTrafficResult(true);
    setTrafficResult("⏳ Predicting traffic...");
    setShowAllSegments(false);
    try {
      console.log(`Geocoding source: "${source}"`);
      const geocodedSource = sourceLatLng || (await geocodePlace(source));
      console.log(`Source coordinates: ${geocodedSource}`);

      console.log(`Geocoding destination: "${destination}"`);
      const geocodedDestination = destinationLatLng || (await geocodePlace(destination));
      console.log(`Destination coordinates: ${geocodedDestination}`);

      const dateTimeStr = toISODateTime(date, time);
      const body = {
        source: geocodedSource,
        destination: geocodedDestination,
        date_time: dateTimeStr,
        travel_mode: selectedTransport
      };

      console.log('Sending route request with body:', body);
      console.log('Request URL:', `/api/routes/`);

      const response = await fetch(`/api/routes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const data = await response.json();
      console.log('Route response data:', data);

      if (!response.ok) {
        console.error('Response not ok:', response.status, data);
        setTrafficResult(`Error: ${data.error || 'Error fetching route'}`);
        return;
      }

      if (!data || data.length === 0) {
        console.error('No route data received');
        setTrafficResult('Error: No route data received from server');
        return;
      }

      console.log('Setting routes:', data);
      setRoutes(data);
      const bestIdx = data.findIndex(r => r.recommended) !== -1 ? data.findIndex(r => r.recommended) : 0;
      setSelectedRouteIdx(bestIdx);
      setRouteData(data[bestIdx]);
      setTrafficResult('');
    } catch (err) {
      console.error('Route request error:', err);
      setTrafficResult(`Error: ${err.message}`);
    }
  };


  const getNameFromCords = async (lat, lng) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      const resp = await fetch(url)
      const data = await resp.json()
      return data.display_name
    } catch (error) {
      console.log({ error })
      return null
    }
  }

  const handleMapClick = async (location) => {
    let lat = null, lng = null;

    console.log({ location }, activeFieldRef.current)
    // If the location is already coordinates, parse them
    if (/^-?\d+\.\d+,-?\d+\.\d+$/.test(location)) {
      [lat, lng] = location.split(',').map(Number);
      const name = await getNameFromCords(lat, lng)
      console.log({ name })
      if (name) {
        if (activeFieldRef.current === 'source') {
          setSourceLatLng(location)
          console.log({})
          setSource(name) };
        if (activeFieldRef.current === 'destination') {
          setDestinationLatLng(location)
          setDestination(name)
        }
      }
    } else {

      // // // If it's a place name, just set it (shouldn't happen for map click, but safe)
      // // if (activeFieldRef.current === 'source') setSource(location);
      // // else if (activeFieldRef.current === 'destination') {
      // //   setDestination(location)
      // // };
      // // Clear previous routes and results
      // setRoutes([]);
      // setRouteData(null);
      // setSelectedRouteIdx(0);
      // setShowTrafficResult(false);
      // setTrafficResult('');
      // setShowAllSegments(false);
      // return;
    }
    // // Try to find the nearest known place
    // const nearestLocation = findNearestLocation(lat, lng);
    // if (nearestLocation) {
    //   if (activeFieldRef.current === 'source') setSource(nearestLocation);
    //   else if (activeFieldRef.current === 'destination') setDestination(nearestLocation);
    // } else {
    //   if (activeFieldRef.current === 'source') setSource(location);
    //   else if (activeFieldRef.current === 'destination') setDestination(location);
    // }
    // Clear previous routes and results
    setRoutes([]);
    setRouteData(null);
    setSelectedRouteIdx(0);
    setShowTrafficResult(false);
    setTrafficResult('');
    setShowAllSegments(false);
  };

  // Helper to reverse geocode lat/lng to a place name
  const getPlaceName = async (lat, lng) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      if (data && data.display_name) {
        return data.display_name;
      } else {
        return `${lat},${lng}`;
      }
    } catch {
      return `${lat},${lng}`;
    }
  };

  const handleUseCurrentLocation = async () => {
    setShowLocationPopup(false);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`Current location: ${latitude}, ${longitude}`);
        // Always use exact coordinates for current location, with custom label
        setSource(`IT Softlab mahalakshmi nagar (${latitude.toFixed(6)},${longitude.toFixed(6)})`);
      }, () => {
        alert('Unable to retrieve your location.');
      }, { enableHighAccuracy: true });
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  console.log({ date, time });

  function getTrafficPercentage(route) {
    if (!route || !route.segments || route.segments.length === 0) return "0%";
    const congested = route.segments.filter(
      seg => seg.congestion_level === "red" || seg.congestion_level === "yellow"
    ).length;
    return `${Math.round((congested / route.segments.length) * 100)}%`;
  }

  return (
    <div id="mainContent">
      <header>TRAFFIC FORECASTING - INDORE</header>
      <div style={{
        background: '#fff3cd',
        padding: '8px',
        margin: '10px 0',
        borderRadius: '5px',
        border: '1px solid #ffeaa7',
        fontSize: '13px',
        color: '#856404'
      }}>
        💡 <strong>Tip:</strong> For the most accurate routing, click on the map to select your exact source and destination locations.
      </div>


      <div className="form-container">
        <div className="input-group">
          <label htmlFor="source">Source</label>
          <input
            type="text"
            id="source"
            list="places-list"
            placeholder="e.g., Vijay Nagar"
            autoComplete="off"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              // Clear previous routes and results when source changes
              setRoutes([]);
              setRouteData(null);
              setSelectedRouteIdx(0);
              setShowTrafficResult(false);
              setTrafficResult('');
              setShowAllSegments(false);
            }}
            style={{ background: '#f0f0f0', color: '#000' }}
            onFocus={() => setActiveField('source')}
            onClick={() => setActiveField('source')}
          />
        </div>
        <div className="input-group">
          <label htmlFor="destination">Destination</label>
          <input
            type="text"
            id="destination"
            list="places-list"
            placeholder="e.g., Ayurveda Amratam"
            autoComplete="off"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              // Clear previous routes and results when destination changes
              setRoutes([]);
              setRouteData(null);
              setSelectedRouteIdx(0);
              setShowTrafficResult(false);
              setTrafficResult('');
              setShowAllSegments(false);
            }}
            style={{ background: '#f0f0f0', color: '#000' }}
            onFocus={() => setActiveField('destination')}
            onClick={() => setActiveField('destination')}
          />
        </div>
        <div className="input-group">
          <label htmlFor="date">Date</label>
          <input
            type="text"
            id="date"
            className="flatpickr"
            value={date}
            // onChange={(e) => setDate(e.target.value)}
            style={{ background: '#f0f0f0', color: '#000' }}
          />
        </div>
        <div className="input-group">
          <label htmlFor="time">Time</label>
          <input
            type="text"
            id="time"
            className="flatpickr"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{ background: '#f0f0f0', color: '#000' }}
          />
        </div>
      </div>

      <datalist id="places-list">
        <option value="Vijay Nagar" />
        <option value="Rajwada" />
        <option value="Palasia" />
        <option value="Bhawarkua" />
        <option value="Nipania" />
        <option value="Chhoti Gwaltoli" />
        <option value="Bengali Square" />
        <option value="Geeta Bhawan" />
        <option value="LIG Square" />
        <option value="MG Road" />
        <option value="Khandwa Road" />
        <option value="AB Road" />
        <option value="Ring Road" />
        <option value="MR 10" />
        <option value="MR 9" />
        <option value="MR 8" />
        <option value="MR 7" />
        <option value="MR 6" />
        <option value="MR 5" />
        <option value="MR 4" />
        <option value="MR 3" />
        <option value="MR 2" />
        <option value="MR 1" />
        <option value="Mahalaxmi Nagar Main Road" />
        <option value="Mahalaxmi Nagar" />
        <option value="Piplya Kumar" />
        <option value="Treasure Island Mall" />
        <option value="C21 Mall" />
        <option value="Phoenix Citadel Mall" />
        <option value="Central Mall" />
        <option value="Malhar Mega Mall" />
        <option value="Prestige Mall" />
        <option value="Sapna Sangeeta Mall" />
        <option value="Rajendra Nagar Mall" />
        <option value="MY Hospital" />
        <option value="Choithram Hospital" />
        <option value="Bombay Hospital" />
        <option value="Apollo Hospital" />
        <option value="Medanta Hospital" />
        <option value="Medanta" />
        <option value="Sri Aurobindo Hospital" />
        <option value="Kokilaben Hospital" />
        <option value="Life Care Hospital" />
        <option value="Shri Krishna Hospital" />
        <option value="City Hospital" />
        <option value="Ayurveda Amratam" />
        <option value="Khajrana Temple" />
        <option value="Sarafa Bazaar" />
        <option value="Rajwada Palace" />
        <option value="Lalbagh Palace" />
        <option value="Kanch Mandir" />
        <option value="Gomatgiri" />
        <option value="Patalpani" />
        <option value="Tincha Falls" />
        <option value="Ralamandal" />
        <option value="Choral Dam" />
        <option value="Indore Airport" />
        <option value="Railway Station" />
        <option value="Bus Stand" />
        <option value="Devi Ahilya Bai Holkar Airport" />
        <option value="Indore Junction" />
        <option value="Rajendra Nagar Station" />
        <option value="Lakshmibai Nagar Station" />
        <option value="IIT Indore" />
        <option value="IIM Indore" />
        <option value="DAVV University" />
        <option value="IPS Academy" />
        <option value="SGSITS" />
        <option value="Medicaps University" />
        <option value="Acropolis Institute" />
        <option value="Vikram University" />
        <option value="Rajwada Market" />
        <option value="Sarafa Market" />
        <option value="Chappan Dukaan" />
        <option value="56 Dukaan" />
        <option value="Khatipura Market" />
        <option value="Vijay Nagar Market" />
        <option value="Palasia Market" />
        <option value="Bhawarkua Market" />
        <option value="Nehru Park" />
        <option value="Kamla Nehru Park" />
        <option value="Regional Park" />
        <option value="Indore Zoo" />
        <option value="Patalpani Waterfall" />
        <option value="Tincha Waterfall" />
        <option value="Collector Office" />
        <option value="Municipal Corporation" />
        <option value="Police Station" />
        <option value="District Court" />
        <option value="High Court" />
        <option value="Passport Office" />
        <option value="RTO Office" />
        <option value="Gurudwara" />
        <option value="Masjid" />
        <option value="Church" />
        <option value="Jain Temple" />
        <option value="Hanuman Temple" />
        <option value="Ganesh Temple" />
        <option value="Shiv Temple" />
        <option value="Durga Temple" />
      </datalist>

      <div className="transport-section">
        <div className="transport-options">
          <button
            className={selectedTransport === 'bike' ? 'active' : ''}
            onClick={() => handleTransportChange('bike')}
          >
            Bike
          </button>
          <button
            className={selectedTransport === 'car' ? 'active' : ''}
            onClick={() => handleTransportChange('car')}
          >
            Car
          </button>
          <button
            className={selectedTransport === 'walk' ? 'active' : ''}
            onClick={() => handleTransportChange('walk')}
          >
            Walk
          </button>
        </div>
        <button id="routeBtn" onClick={handleRouteRequest}>
          Show Best Route
        </button>
      </div>

      {routes.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '2rem',
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 2px 8px #aaa',
          padding: '1rem',
          zIndex: 1000,
          minWidth: '200px',
          maxHeight: '60vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          alignItems: 'stretch',
          fontFamily: 'Segoe UI, Arial, sans-serif',
        }}>
          <div style={{
            color: '#000',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            marginBottom: '0.5rem',
            fontFamily: 'inherit'
          }}>
            Available Routes
          </div>
          {routes.map((r, idx) => (
            <button
              key={idx}
              style={{
                fontWeight: idx === selectedRouteIdx ? 'bold' : 'normal',
                color: '#111',
                border: idx === selectedRouteIdx ? '2px solid #888' : '1px solid #ccc',
                background: idx === selectedRouteIdx ? '#e0e0e0' : '#fff',
                cursor: 'pointer',
                borderRadius: 6,
                padding: '0.5rem 1rem',
                margin: 0,
                minWidth: '160px',
                textAlign: 'center',
                boxShadow: idx === selectedRouteIdx ? '0 2px 8px #ccc' : 'none',
                fontFamily: 'inherit',
                fontSize: '1rem',
                transition: 'background 0.2s, border 0.2s',
              }}
              onClick={() => {
                setSelectedRouteIdx(idx);
                setRouteData(routes[idx]);
              }}
            >
              {r.route_name} <br />({r.total_distance_km} km, {r.total_time_min} min){r.recommended ? ' [Fastest]' : ''}
            </button>
          ))}
        </div>
      )}

      {showTrafficResult && (
        <div id="trafficResult" style={{ display: 'block' }}>
          {trafficResult && <div dangerouslySetInnerHTML={{ __html: trafficResult }} />}
          {routeData && (
            <div>
              Predicted results.
            </div>
          )}
        </div>
      )}

      <TrafficMap
        routeData={routeData}
        routes={routes}
        selectedRouteIdx={selectedRouteIdx}
        onRouteClick={(idx) => {
          setSelectedRouteIdx(idx);
          setRouteData(routes[idx]);
        }}
        onMapClick={(e) => {
          console.log({ e })
          handleMapClick(e)
        }}
      />

      <footer>🌍 Made with ❤️ for Indore | Demo UI</footer>

      {showPermissionDialog && (
        <PermissionDialog onPermission={handlePermission} />
      )}
    </div>
  );
};

export default MainContent; 