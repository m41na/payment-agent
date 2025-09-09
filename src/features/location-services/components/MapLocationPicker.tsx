import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useLocationServices } from '../hooks/useLocationServices';
import { LocationData, Coordinates } from '../types';

interface MapLocationPickerProps {
  location?: LocationData | null;
  onLocationChange: (location: LocationData) => void;
  editable?: boolean;
  height?: number;
  showCoordinates?: boolean;
}

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  location,
  onLocationChange,
  editable = true,
  height = 320,
  showCoordinates = true,
}) => {
  const { 
    currentLocation, 
    getCurrentLocation, 
    permissions, 
    requestPermissions,
    loading: isLoading 
  } = useLocationServices();

  const [selectedLocation, setSelectedLocation] = useState<LocationData>(
    location || { latitude: 37.78825, longitude: -122.4324 }
  );
  const [isMapReady, setIsMapReady] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Memoize the callback to prevent recreating it
  const stableOnLocationChange = useCallback((newLocation: LocationData) => {
    onLocationChange(newLocation);
  }, [onLocationChange]);

  // Initialize permissions and location only once
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      if (!permissions?.granted) {
        requestPermissions();
      }
    }
  }, [initialized, permissions?.granted, requestPermissions]);

  // Get current location when permissions are granted
  useEffect(() => {
    if (permissions?.granted && !currentLocation && !isLoading && initialized) {
      getCurrentLocation();
    }
  }, [permissions?.granted, currentLocation, isLoading, initialized, getCurrentLocation]);

  // Update selected location when location prop changes
  useEffect(() => {
    if (location) {
      setSelectedLocation(location);
    }
  }, [location]);

  // Set initial location from current location (only once)
  useEffect(() => {
    if (currentLocation && !location && initialized) {
      const initialLocation = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      };
      setSelectedLocation(initialLocation);
      stableOnLocationChange(initialLocation);
    }
  }, [currentLocation, location, initialized, stableOnLocationChange]);

  const handleMapMessage = useCallback((event: any) => {
    if (!editable) return;
    
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapClick') {
        const updatedLocation = {
          latitude: data.lat,
          longitude: data.lng,
        };
        setSelectedLocation(updatedLocation);
        stableOnLocationChange(updatedLocation);
      } else if (data.type === 'mapReady') {
        setIsMapReady(true);
      }
    } catch (error) {
      console.log('Error parsing map message:', error);
    }
  }, [editable, stableOnLocationChange]);

  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { margin: 0; padding: 0; touch-action: manipulation; }
            #map { height: 100vh; width: 100vw; }
            ${!editable ? '.leaflet-clickable { pointer-events: none; }' : ''}
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            try {
                var map = L.map('map', {
                    tap: true,
                    tapTolerance: 15,
                    touchZoom: true,
                    doubleClickZoom: true,
                    scrollWheelZoom: true,
                    boxZoom: true,
                    keyboard: true
                }).setView([${selectedLocation.latitude}, ${selectedLocation.longitude}], 13);
                
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: 'OpenStreetMap contributors'
                }).addTo(map);
                
                var marker = L.marker([${selectedLocation.latitude}, ${selectedLocation.longitude}]).addTo(map);
                
                ${editable ? `
                map.on('click', function(e) {
                    try {
                        var lat = e.latlng.lat;
                        var lng = e.latlng.lng;
                        
                        marker.setLatLng([lat, lng]);
                        
                        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'mapClick',
                                lat: lat,
                                lng: lng
                            }));
                        }
                    } catch (error) {
                        console.error('Error in map click handler:', error);
                    }
                });
                ` : ''}
                
                map.whenReady(function() {
                    setTimeout(function() {
                        map.invalidateSize();
                        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'mapReady'
                            }));
                        }
                    }, 100);
                });
                
            } catch (error) {
                console.error('Error initializing map:', error);
            }
        </script>
    </body>
    </html>
  `;

  if (!permissions?.granted) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.blockedContainer}>
          <Ionicons name="location-outline" size={48} color="#94a3b8" />
          <Text style={styles.blockedTitle}>Location Access Required</Text>
          <Text style={styles.blockedMessage}>
            This feature requires location access to function properly.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={requestPermissions}
          >
            <Text style={styles.retryButtonText}>Grant Location Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading && !currentLocation) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <Text style={[styles.title, !editable && styles.disabledTitle]}>
        {editable ? 'Tap on map to select location' : 'Selected Location'}
      </Text>
      
      <View style={styles.mapWrapper}>
        <WebView
          source={{ html: mapHTML }}
          style={styles.webview}
          onMessage={handleMapMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
        {!isMapReady && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color="#667eea" />
          </View>
        )}
      </View>
      
      {showCoordinates && (
        <View style={styles.coordinatesContainer}>
          <Text style={styles.coordinatesText}>
            {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    color: '#374151',
  },
  disabledTitle: {
    color: '#64748b',
  },
  mapWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coordinatesContainer: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  coordinatesText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#64748b',
    fontWeight: '500',
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  blockedTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    color: '#374151',
  },
  blockedMessage: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    color: '#64748b',
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
  },
});

export default MapLocationPicker;
