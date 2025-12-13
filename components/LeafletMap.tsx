import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMapEvent } from 'react-leaflet';
import { useState, ReactNode } from 'react';
import { LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPosition {
  lat: number;
  lng: number;
}

interface MapClickEvent {
  latlng: MapPosition;
}

function LocationPopup(): ReactNode {
  const [position, setPosition] = useState<MapPosition | null>(null);
  useMapEvent('click', (e: MapClickEvent) => {
    setPosition(e.latlng);
  });
  return position ? (
    <Popup position={position}>
      You clicked the map at <br />
      {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
    </Popup>
  ) : null;
}

export default function LeafletMap(): JSX.Element {
  const center: LatLngTuple = [51.505, -0.09];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
      />
      <Marker position={[51.5, -0.09] as LatLngTuple}>
        <Popup>
          <b>Hello world!</b><br />I am a popup.
        </Popup>
      </Marker>
      <Circle
        center={[51.508, -0.11] as LatLngTuple}
        pathOptions={{ color: 'red', fillColor: '#f03', fillOpacity: 0.5 }}
        radius={500}
      >
        <Popup>I am a circle.</Popup>
      </Circle>
      <Polygon
        positions={[[51.509, -0.08], [51.503, -0.06], [51.51, -0.047]] as LatLngTuple[]}
        pathOptions={{ color: 'purple' }}
      >
        <Popup>I am a polygon.</Popup>
      </Polygon>
      <LocationPopup />
    </MapContainer>
  );
}
