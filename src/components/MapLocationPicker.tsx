import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Text, Button, IconButton } from 'react-native-paper';
import * as Location from 'expo-location';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  locationName?: string;
}

interface MapLocationPickerProps {
  location?: LocationData | null;
  onLocationChange: (location: LocationData) => void;
  editable?: boolean;
}

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  location,
  onLocationChange,
  editable = true,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<LocationData>(
    location || { latitude: 37.78825, longitude: -122.4324 }
  );
  const [currentLocation, setCurrentLocation] = useState({ lat: 37.78825, lng: -122.4324 });
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (location) {
      setSelectedLocation(location);
    }
  }, [location]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setLocationPermissionGranted(true);
        await getCurrentLocation();
      } else {
        setLocationPermissionGranted(false);
        setIsLoadingLocation(false);
      }
    } catch (error) {
      console.log('Error requesting location permission:', error);
      setLocationPermissionGranted(false);
      setIsLoadingLocation(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const newLocation = {
        lat: locationResult.coords.latitude,
        lng: locationResult.coords.longitude,
      };
      setCurrentLocation(newLocation);
      
      if (!location) {
        const updatedLocation = {
          latitude: locationResult.coords.latitude,
          longitude: locationResult.coords.longitude,
        };
        setSelectedLocation(updatedLocation);
        onLocationChange(updatedLocation);
      }
      
      setIsLoadingLocation(false);
    } catch (error) {
      console.log('Error getting location:', error);
      setIsLoadingLocation(false);
    }
  };

  const handleMapMessage = (event: any) => {
    if (!editable) return;
    
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapClick') {
        const updatedLocation = {
          latitude: data.lat,
          longitude: data.lng,
        };
        setSelectedLocation(updatedLocation);
        onLocationChange(updatedLocation);
      }
    } catch (error) {
      console.log('Error parsing map message:', error);
    }
  };

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
                }).setView([${selectedLocation.latitude || currentLocation.lat}, ${selectedLocation.longitude || currentLocation.lng}], 13);
                
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: 'OpenStreetMap contributors'
                }).addTo(map);
                
                var marker = L.marker([${selectedLocation.latitude || currentLocation.lat}, ${selectedLocation.longitude || currentLocation.lng}]).addTo(map);
                
                ${editable ? `
                // Add click event listener
                map.on('click', function(e) {
                    try {
                        var lat = e.latlng.lat;
                        var lng = e.latlng.lng;
                        
                        console.log('Map clicked at:', lat, lng);
                        
                        marker.setLatLng([lat, lng]);
                        
                        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'mapClick',
                                lat: lat,
                                lng: lng
                            }));
                        } else {
                            console.error('ReactNativeWebView not available');
                        }
                    } catch (error) {
                        console.error('Error in map click handler:', error);
                    }
                });
                
                // Add touch events for mobile
                map.on('touchstart', function(e) {
                    console.log('Touch start detected');
                });
                
                // Ensure map is ready
                map.whenReady(function() {
                    console.log('Map is ready for interaction');
                    setTimeout(function() {
                        map.invalidateSize();
                    }, 100);
                });
                ` : ''}
                
            } catch (error) {
                console.error('Error initializing map:', error);
            }
        </script>
    </body>
    </html>
  `;

  if (!locationPermissionGranted) {
    return (
      <View style={styles.blockedContainer}>
        <Text style={styles.blockedTitle}>Location Access Required</Text>
        <Text style={styles.blockedMessage}>
          This app requires location access to function properly. Please grant location permission to continue.
        </Text>
        <Button 
          mode="contained" 
          onPress={requestLocationPermission}
          style={styles.retryButton}
        >
          Grant Location Access
        </Button>
      </View>
    );
  }

  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, !editable && styles.disabledTitle]}>
        {editable ? 'Tap on map to select storefront location' : 'Storefront Location'}
      </Text>
      
      <View style={styles.mapWrapper}>
        <WebView
          source={{ html: mapHTML }}
          style={styles.webview}
          onMessage={handleMapMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
      
      <View style={styles.coordinatesContainer}>
        <Text style={styles.coordinatesText}>
          Location: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 320,
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
  },
  webview: {
    flex: 1,
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
    color: '#374151',
  },
  blockedMessage: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    color: '#64748b',
  },
  retryButton: {
    width: '100%',
    padding: 8,
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
  },
});

export default MapLocationPicker;
