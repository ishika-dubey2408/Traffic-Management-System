import React from 'react';
import { findNearestLocation } from '../utils/locations';

const PermissionDialog = ({ onPermission }) => {
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

  const handleAllow = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`PermissionDialog - Current location: ${latitude}, ${longitude}`);
        // Try to find the nearest predefined location name (within 500m)
        const nearestLocation = findNearestLocation(latitude, longitude);
        if (nearestLocation) {
          onPermission(true, nearestLocation);
        } else {
          // Try to get a human-readable address from OSM
          try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
            const resp = await fetch(url);
            const data = await resp.json();
            if (data && data.display_name) {
              onPermission(true, data.display_name);
              return;
            }
          } catch (e) { /* ignore */ }
          // Fallback to coordinates
          onPermission(true, `${latitude.toFixed(6)},${longitude.toFixed(6)}`);
        }
      }, () => {
        onPermission(true, null);
      }, { enableHighAccuracy: true });
    } else {
      onPermission(true, null);
    }
  };

  return (
    <div className="permission-dialog" style={{ display: 'block' }}>
      <h3>Location Access Required</h3>
      <p>This app wants to access your location to provide accurate traffic information.</p>
      <div className="permission-buttons">
        <button 
          className="permission-btn permission-deny" 
          onClick={() => onPermission(false)}
        >
          Deny
        </button>
        <button 
          className="permission-btn permission-allow" 
          onClick={handleAllow}
        >
          Allow
        </button>
      </div>
    </div>
  );
};

export default PermissionDialog; 