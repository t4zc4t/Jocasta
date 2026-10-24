import { useEffect, useRef, useState } from "react";
import {
  AttributionControl,
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  ScaleControl,
  setWorkerUrl,
} from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { LAYERS, SAMPLE_RECORDS, type LayerId } from "../data/sample";

function addDemoMapLayers(map: MapLibreMap) {
  map.addSource("jocasta-demo-records", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: SAMPLE_RECORDS.map((record) => ({
        type: "Feature" as const,
        properties: { kind: record.kind, label: record.label },
        geometry: { type: "Point" as const, coordinates: record.coordinates },
      })),
    },
  });

  for (const layer of LAYERS) {
    map.addLayer({
      id: layer.mapLayerId,
      type: "circle",
      source: "jocasta-demo-records",
      filter: ["==", ["get", "kind"], layer.id],
      paint: {
        "circle-radius": 6,
        "circle-color": layer.color,
        "circle-opacity": 0.92,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#111923",
      },
    });

    map.on("mouseenter", layer.mapLayerId, () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", layer.mapLayerId, () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("click", layer.mapLayerId, (event) => {
      const feature = event.features?.[0];
      const rawLabel = feature?.properties?.label;
      const label =
        typeof rawLabel === "string" ? rawLabel : "Synthetic sample record";

      const content = document.createElement("div");
      content.className = "jocasta-popup";

      const heading = document.createElement("strong");
      heading.textContent = label;

      const detail = document.createElement("p");
      detail.textContent =
        "Synthetic demonstration data. This is not a real-world event or live intelligence.";

      content.append(heading, detail);

      new Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: "260px",
      })
        .setLngLat(event.lngLat)
        .setDOMContent(content)
        .addTo(map);
    });
  }
}

type WorldMapProps = {
  activeLayers: Record<LayerId, boolean>;
};

export default function WorldMap({ activeLayers }: WorldMapProps) {
  const [mapStatus, setMapStatus] = useState("CONNECTING");
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    setWorkerUrl(mapWorkerUrl);

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [12, 19],
      zoom: 1.25,
      minZoom: 1,
      maxZoom: 7,
      attributionControl: false,
    });

    mapRef.current = map;

    let styleLoaded = false;

    map.addControl(
      new NavigationControl({
        showCompass: true,
        visualizePitch: true,
      }),
      "top-right",
    );
    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");

    map.once("load", () => {
      styleLoaded = true;
      addDemoMapLayers(map);
      setMapStatus("BASEMAP READY");
      setMapReady(true);
    });

    map.on("error", () => {
      if (!styleLoaded) {
        setMapStatus("MAP SERVICE UNAVAILABLE");
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReady || !map.isStyleLoaded()) {
      return;
    }

    for (const layer of LAYERS) {
      if (map.getLayer(layer.mapLayerId)) {
        map.setLayoutProperty(
          layer.mapLayerId,
          "visibility",
          activeLayers[layer.id] ? "visible" : "none",
        );
      }
    }
  }, [activeLayers, mapReady]);

  return (
    <>
      <div
        ref={mapContainerRef}
        className="map-canvas"
        aria-label="Interactive world map with synthetic sample markers"
      />
      <div className="map-status">
        <span
          className={`map-status-dot ${
            mapReady ? "map-status-dot-ready" : ""
          }`}
        />
        {mapStatus}
      </div>
    </>
  );
}
