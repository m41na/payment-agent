import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Platform } from 'react-native';
import SharedMapView from './SharedMapView';
import { Ionicons } from '@expo/vector-icons';
import { useLocationServices } from '../hooks/useLocationServices';
import { LocationData, Coordinates } from '../types';
import { appTheme } from '../../theme';

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


  // Native MapView implementation using react-native-maps and OpenStreetMap tiles

  const initialRegion = {
    latitude: selectedLocation.latitude,
    longitude: selectedLocation.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const handleMapPress = useCallback((e: any) => {
    if (!editable) return;
    const { coordinate } = e.nativeEvent;
    const updatedLocation = { latitude: coordinate.latitude, longitude: coordinate.longitude };
    setSelectedLocation(updatedLocation);
    stableOnLocationChange(updatedLocation);
  }, [editable, stableOnLocationChange]);

  if (!permissions?.granted) {
    return (
      <View style={[styles.container, { height }] }>
        <View style={styles.blockedContainer}>
          <Ionicons name="location-outline" size={48} color={appTheme.colors.muted} />
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
      <View style={[styles.container, { height }] }>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }] }>
      <Text style={[styles.title, !editable && styles.disabledTitle]}>
        {editable ? 'Tap on map to select location' : 'Selected Location'}
      </Text>

      <View style={styles.mapWrapper}>
        <SharedMapView
          singleMarker={{ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }}
          onMapPress={(coord) => handleMapPress({ nativeEvent: { coordinate: coord } })}
          center={currentLocation ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : null}
          height={height}
        />
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
    color: appTheme.colors.textPrimary,
  },
  disabledTitle: {
    color: appTheme.colors.textSecondary,
  },
  mapWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: appTheme.colors.border,
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
    backgroundColor: appTheme.colors.surfaceElevated,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  coordinatesText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: appTheme.colors.textSecondary,
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
    color: appTheme.colors.textPrimary,
  },
  blockedMessage: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    color: appTheme.colors.textSecondary,
  },
  retryButton: {
    backgroundColor: appTheme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: appTheme.colors.surface,
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
