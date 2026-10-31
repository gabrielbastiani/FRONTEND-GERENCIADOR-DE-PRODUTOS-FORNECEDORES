"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap
} from "react-leaflet";
import { LatLngBounds } from "leaflet";

export type MapPlace = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

type Props = {
  center: { lat: number; lon: number };
  radiusKm?: number;
  places: MapPlace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function MapController({
  center,
  places,
  selected
}: {
  center: { lat: number; lon: number };
  places: MapPlace[];
  selected: MapPlace | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (places.length > 1) {
      const bounds = new LatLngBounds(places.map((place) => [place.lat, place.lon] as [number, number]));
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
      return;
    }
    map.setView([center.lat, center.lon], 13);
  }, [center.lat, center.lon, places, map]);

  useEffect(() => {
    if (selected) map.panTo([selected.lat, selected.lon]);
  }, [selected, map]);

  return null;
}

export default function ProspectingMap({
  center,
  radiusKm = 0,
  places,
  selectedId,
  onSelect
}: Props) {
  const selected = places.find((place) => place.id === selectedId) || null;

  return (
    <MapContainer
      center={[center.lat, center.lon]}
      zoom={12}
      className="h-full w-full rounded-xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController center={center} places={places} selected={selected} />
      {radiusKm > 0 && (
        <Circle
          center={[center.lat, center.lon]}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#64748b", weight: 1, fillOpacity: 0.04 }}
        />
      )}
      {places.map((place) => {
        const isSelected = place.id === selectedId;
        return (
          <CircleMarker
            key={place.id}
            center={[place.lat, place.lon]}
            radius={isSelected ? 11 : 7}
            pathOptions={{
              color: isSelected ? "#be123c" : "#1d4ed8",
              fillColor: isSelected ? "#e11d48" : "#3b82f6",
              fillOpacity: 0.85,
              weight: 2
            }}
            eventHandlers={{ click: () => onSelect(place.id) }}
          >
            <Tooltip>{place.name}</Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
