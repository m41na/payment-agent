import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { appTheme } from '../../theme';

type Item = any;

interface SharedMapViewProps {
  items?: Item[];
  center?: { lat: number; lng: number } | null;
  height?: number;
  onMarkerPress?: (item: Item) => void;
  singleMarker?: { latitude: number; longitude: number } | null;
  onMapPress?: (coord: { latitude: number; longitude: number }) => void;
}

function buildMarkers(items: Item[] | undefined) {
  if (!items) return [];
  return items
    .filter(i => (i.latitude || i.lat || (i.location && i.location.latitude)) && (i.longitude || i.lng || (i.location && i.location.longitude)))
    .map(i => ({
      id: i.id || i._id || String(Math.random()),
      title: (i.title || i.name || '').toString(),
      lat: i.latitude || i.lat || (i.location && i.location.latitude),
      lng: i.longitude || i.lng || (i.location && i.location.longitude),
      original: i,
    }));
}

const SharedMapView: React.FC<SharedMapViewProps> = ({ items, center, height = 420, onMarkerPress, singleMarker, onMapPress }) => {
  const markers = useMemo(() => buildMarkers(items), [items]);

  const initialRegion = useMemo(() => ({
    latitude: center?.lat || (markers[0] && markers[0].lat) || (singleMarker && singleMarker.latitude) || 37.78825,
    longitude: center?.lng || (markers[0] && markers[0].lng) || (singleMarker && singleMarker.longitude) || -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }), [center, markers, singleMarker]);

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        onPress={(e) => onMapPress && onMapPress(e.nativeEvent.coordinate)}
      >
        <UrlTile urlTemplate={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'} maximumZ={19} />

        {singleMarker && (
          <Marker coordinate={{ latitude: singleMarker.latitude, longitude: singleMarker.longitude }} />
        )}

        {markers.map(m => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.lat, longitude: m.lng }}
            title={m.title}
            onPress={() => onMarkerPress && onMarkerPress(m.original)}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  map: {
    flex: 1,
  },
});

export default SharedMapView;
