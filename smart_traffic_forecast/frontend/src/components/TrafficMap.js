import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { findNearestLocation } from '../utils/locations';

const TrafficMap = ({ routeData, routes, selectedRouteIdx, onRouteClick, onMapClick }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routePolylineGroupRef = useRef([]);
  const sourceMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const clickMarkerRef = useRef(null);

  useEffect(() => {
    if (!mapInstanceRef.current) {
      // Initialize map
      mapInstanceRef.current = L.map(mapRef.current).setView([22.7196, 75.8577], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Add click event listener to the map
      mapInstanceRef.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const exactCoords = `${lat.toFixed(6)},${lng.toFixed(6)}`;
            onMapClick(exactCoords);

        // console.log(`Map clicked at: ${lat}, ${lng}`);
        
        // // First check if this location has a predefined name
        // const nearestLocation = findNearestLocation(lat, lng);
        
        // if (nearestLocation) {
        //   // If a predefined location is found nearby, use the location name
        //   console.log(`Found predefined location: ${nearestLocation}`);
        //   if (onMapClick) {
        //     onMapClick(nearestLocation);
        //   }
        // } else {
        //   // If no predefined location found, use exact coordinates
        //   const exactCoords = `${lat.toFixed(6)},${lng.toFixed(6)}`;
        //   console.log(`No predefined location found, using exact coordinates: ${exactCoords}`);
        //   if (onMapClick) {
        //     onMapClick(exactCoords);
        //   }
        // }
      });

      // Enable location if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            const { latitude, longitude } = position.coords;
            mapInstanceRef.current.setView([latitude, longitude], 14);
            if (userMarkerRef.current) mapInstanceRef.current.removeLayer(userMarkerRef.current);
            userMarkerRef.current = L.marker([latitude, longitude]).addTo(mapInstanceRef.current)
              .bindPopup("You are here").openPopup();
          },
          error => {
            console.error(error);
          },
          { enableHighAccuracy: true }
        );
      }
    }
  }, [onMapClick]);

  useEffect(() => {
    if (routes && routes.length > 0 && mapInstanceRef.current) {
      // Remove previous routes and markers
      routePolylineGroupRef.current.forEach(l => mapInstanceRef.current.removeLayer(l));
      routePolylineGroupRef.current = [];
      if (sourceMarkerRef.current) mapInstanceRef.current.removeLayer(sourceMarkerRef.current);
      if (destMarkerRef.current) mapInstanceRef.current.removeLayer(destMarkerRef.current);
      // Only draw the selected route with traffic colors
      const selected = routes[selectedRouteIdx];
      if (selected && selected.segments) {
        const congestionColors = {
          red: '#d50000',
          yellow: '#ffd600',
          green: '#00c853',
        };
        for (let i = 0; i < selected.segments.length; i++) {
          const seg = selected.segments[i];
          let color = congestionColors[seg.congestion_level] || '#00c853';
          const latlngs = [
            [seg.latitude_start, seg.longitude_start],
            [seg.latitude_end, seg.longitude_end]
          ];
          const polyline = L.polyline(latlngs, {
            color,
            weight: 8,
            opacity: 0.9,
            lineCap: 'round',
          }).addTo(mapInstanceRef.current);
          routePolylineGroupRef.current.push(polyline);
        }
        // Add source/dest markers for selected route
        const src = selected.segments[0];
        const dst = selected.segments[selected.segments.length-1];
        const getSvgIcon = (color) => {
          return L.divIcon({
            className: 'custom-marker',
            html: `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g filter="url(#shadow)">
                <path d="M24 4C14.0589 4 6 12.0589 6 22C6 34.5 24 44 24 44C24 44 42 34.5 42 22C42 12.0589 33.9411 4 24 4Z" fill="${color}"/>
                <circle cx="24" cy="22" r="7" fill="white"/>
              </g>
              <defs>
                <filter id="shadow" x="0" y="0" width="48" height="48" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="black" flood-opacity="0.3"/>
                </filter>
              </defs>
            </svg>`,
            iconSize: [48, 48],
            iconAnchor: [24, 48]
          });
        };
        sourceMarkerRef.current = L.marker([src.latitude_start, src.longitude_start], {
          icon: getSvgIcon('red')
        }).addTo(mapInstanceRef.current);
        destMarkerRef.current = L.marker([dst.latitude_end, dst.longitude_end], {
          icon: getSvgIcon('green')
        }).addTo(mapInstanceRef.current);
        // Fit map to selected route
        const allLatLngs = selected.segments.flatMap(seg => [
          [seg.latitude_start, seg.longitude_start],
          [seg.latitude_end, seg.longitude_end]
        ]);
        mapInstanceRef.current.fitBounds(allLatLngs);
      }
    } else if (routeData && mapInstanceRef.current) {
      console.log("Drawing route on map with", routeData.segments.length, "segments");
      console.log("Route data:", routeData);
      console.log("Route segments:", routeData.segments);
      
      // Remove previous route and markers
      routePolylineGroupRef.current.forEach(l => mapInstanceRef.current.removeLayer(l));
      routePolylineGroupRef.current = [];
      
      if (sourceMarkerRef.current) mapInstanceRef.current.removeLayer(sourceMarkerRef.current);
      if (destMarkerRef.current) mapInstanceRef.current.removeLayer(destMarkerRef.current);

      // Google Maps-like traffic color mapping
      const congestionColors = {
        red: '#d50000',
        yellow: '#ffd600',
        green: '#00c853',
      };

      // Draw each segment as a separate polyline
      for (let i = 0; i < routeData.segments.length; i++) {
        const seg = routeData.segments[i];
        console.log('Segment congestion_level:', seg.congestion_level);
        let color = congestionColors[seg.congestion_level] || '#00c853';
        const latlngs = [
          [seg.latitude_start, seg.longitude_start],
          [seg.latitude_end, seg.longitude_end]
        ];
        const polyline = L.polyline(latlngs, {
          color,
          weight: 8,
          opacity: 0.9,
          lineCap: 'round',
        }).addTo(mapInstanceRef.current);
        routePolylineGroupRef.current.push(polyline);
      }
      
      // Fit map to route
      const allLatLngs = routeData.segments.flatMap(seg => [
        [seg.latitude_start, seg.longitude_start],
        [seg.latitude_end, seg.longitude_end]
      ]);
      mapInstanceRef.current.fitBounds(allLatLngs);
      
      // SVG marker icon generator
      const getSvgIcon = (color) => {
        return L.divIcon({
          className: 'custom-marker',
          html: `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g filter="url(#shadow)">
              <path d="M24 4C14.0589 4 6 12.0589 6 22C6 34.5 24 44 24 44C24 44 42 34.5 42 22C42 12.0589 33.9411 4 24 4Z" fill="${color}"/>
              <circle cx="24" cy="22" r="7" fill="white"/>
            </g>
            <defs>
              <filter id="shadow" x="0" y="0" width="48" height="48" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="black" flood-opacity="0.3"/>
              </filter>
            </defs>
          </svg>`,
          iconSize: [48, 48],
          iconAnchor: [24, 48]
        });
      };
      // Add source and destination markers with red location emoji
      const src = routeData.segments[0];
      const dst = routeData.segments[routeData.segments.length-1];
      console.log("Adding source marker at:", src.latitude_start, src.longitude_start);
      console.log("Adding dest marker at:", dst.latitude_end, dst.longitude_end);
      console.log("Source segment:", src);
      console.log("Destination segment:", dst);
      
      sourceMarkerRef.current = L.marker([src.latitude_start, src.longitude_start], {
        icon: getSvgIcon('red')
      }).addTo(mapInstanceRef.current);
      
      destMarkerRef.current = L.marker([dst.latitude_end, dst.longitude_end], {
        icon: getSvgIcon('green')
      }).addTo(mapInstanceRef.current);
      
      console.log("Route drawing completed");
    }
  }, [routes, selectedRouteIdx, routeData]);

  return <div id="map" ref={mapRef} style={{ height: '400px', width: '100%' }} />;
};

export default TrafficMap; 