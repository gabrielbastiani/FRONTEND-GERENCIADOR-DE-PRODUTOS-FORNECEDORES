"use client";

import "leaflet/dist/leaflet.css";
import L, { type Map as LeafletMap, type LayerGroup } from "leaflet";
import { useEffect, useRef } from "react";

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

/**
 * Mapa Leaflet gerenciado diretamente pelo componente.
 *
 * Evitamos MapContainer/TileLayer do React-Leaflet neste componente porque,
 * em navegações client-side com React Strict Mode, o ciclo de montagem e
 * desmontagem pode tentar reutilizar o mesmo elemento DOM enquanto o Leaflet
 * ainda está limpando a instância anterior.
 */
export default function ProspectingMap({
  center,
  radiusKm = 0,
  places,
  selectedId,
  onSelect
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);

  // Mantém o callback atualizado sem reconstruir os marcadores a cada render.
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Cria exatamente uma instância Leaflet por montagem e a remove no cleanup.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Cada instância recebe um elemento DOM novo. Isso impede que o Leaflet
    // encontre um _leaflet_id antigo quando o React Strict Mode executa
    // montagem -> cleanup -> montagem em desenvolvimento.
    const mapElement = document.createElement("div");
    mapElement.className = "h-full w-full";
    container.appendChild(mapElement);

    const initialLat = Number.isFinite(center.lat) ? center.lat : 0;
    const initialLon = Number.isFinite(center.lon) ? center.lon : 0;

    const map = L.map(mapElement, {
      center: [initialLat, initialLon],
      zoom: 12,
      scrollWheelZoom: true,
      preferCanvas: true,
      zoomControl: true
    });

    mapRef.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);

    const layers = L.layerGroup().addTo(map);
    layersRef.current = layers;

    let resizeFrame = 0;
    const invalidateSize = () => {
      if (mapRef.current !== map || !container.isConnected) return;
      map.invalidateSize({ pan: false, animate: false });
    };

    resizeFrame = window.requestAnimationFrame(invalidateSize);

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          if (mapRef.current === map && container.isConnected) {
            map.invalidateSize({ pan: false, animate: false });
          }
        })
      : null;

    resizeObserver?.observe(container);

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();

      // Invalida as refs antes de remover a instância. Assim, callbacks
      // pendentes não tentam operar sobre um mapa já desmontado.
      if (mapRef.current === map) mapRef.current = null;
      if (layersRef.current === layers) layersRef.current = null;

      try {
        layers.clearLayers();
      } catch {
        // Continua para remover a instância mesmo se uma camada já foi desmontada.
      }

      try {
        // map.remove() executa a limpeza interna de eventos e camadas do Leaflet.
        // Não chamar map.off() antes: a limpeza manual pode invalidar _targets.
        map.remove();
      } catch {
        // O cleanup deve permanecer idempotente durante desmontagens do React.
      }

      mapElement.remove();
    };
    // A criação depende apenas do ciclo de vida do componente. As alterações
    // de centro e marcadores são tratadas no efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualiza centro, círculo e marcadores sem recriar a instância do mapa.
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    const validPlaces = places.filter((place) =>
      Number.isFinite(place.lat) &&
      Number.isFinite(place.lon) &&
      place.lat >= -90 && place.lat <= 90 &&
      place.lon >= -180 && place.lon <= 180
    );

    layers.clearLayers();

    if (radiusKm > 0 && Number.isFinite(center.lat) && Number.isFinite(center.lon)) {
      L.circle([center.lat, center.lon], {
        radius: radiusKm * 1000,
        color: "#64748b",
        weight: 1,
        fillOpacity: 0.04
      }).addTo(layers);
    }

    for (const place of validPlaces) {
      const isSelected = place.id === selectedId;
      const marker = L.circleMarker([place.lat, place.lon], {
        radius: isSelected ? 11 : 7,
        color: isSelected ? "#be123c" : "#1d4ed8",
        fillColor: isSelected ? "#e11d48" : "#3b82f6",
        fillOpacity: 0.85,
        weight: 2
      });

      marker.bindTooltip(place.name);
      marker.on("click", () => onSelectRef.current(place.id));
      marker.addTo(layers);
    }

    if (validPlaces.length > 1) {
      const bounds = L.latLngBounds(
        validPlaces.map((place) => [place.lat, place.lon] as [number, number])
      );
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
    } else if (validPlaces.length === 1) {
      const onlyPlace = validPlaces[0];
      map.setView([onlyPlace.lat, onlyPlace.lon], selectedId ? 15 : 13);
    } else if (Number.isFinite(center.lat) && Number.isFinite(center.lon)) {
      map.setView([center.lat, center.lon], 13);
    }

    const selectedPlace = validPlaces.find((place) => place.id === selectedId);
    if (selectedPlace && validPlaces.length > 1) {
      map.panTo([selectedPlace.lat, selectedPlace.lon]);
    }

    // O painel do mapa pode mudar de tamanho ao navegar, expandir ou recolher.
    const frame = window.requestAnimationFrame(() => {
      if (mapRef.current === map && map.getContainer().isConnected) {
        map.invalidateSize({ pan: false, animate: false });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [center.lat, center.lon, radiusKm, places, selectedId]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-xl"
      role="application"
      aria-label="Mapa dos estabelecimentos prospectados"
    />
  );
}
