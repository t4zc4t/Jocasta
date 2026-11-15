import { useEffect, useRef, useState } from "react";
import {
  AttributionControl,
  type GeoJSONSource,
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  ScaleControl,
  setWorkerUrl,
} from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { LAYERS, type LayerId, type SampleRecord } from "../data/sample";

// many borders are disputed (Kashmir and others), so the map shows none
function hideBorders(map: MapLibreMap) {
  for (const layer of map.getStyle().layers) {
    if ("source-layer" in layer && layer["source-layer"] === "boundary") {
      map.setLayoutProperty(layer.id, "visibility", "none");
    }
  }
}

function toGeoJson(records: SampleRecord[]) {
  return {
    type: "FeatureCollection" as const,
    features: records.map((record) => ({
      type: "Feature" as const,
      properties: {
        kind: record.kind,
        label: record.label,
        meta: record.meta ?? "",
        detail: record.detail ?? "",
        source: record.source ?? "",
      },
      geometry: { type: "Point" as const, coordinates: record.coordinates },
    })),
  };
}

function addDemoMapLayers(map: MapLibreMap, records: SampleRecord[]) {
  // thousands of real points would just be a red smear, so group them
  map.addSource("jocasta-demo-records", {
    type: "geojson",
    data: toGeoJson(records),
    cluster: true,
    clusterRadius: 42,
    clusterMaxZoom: 6,
  });

  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "jocasta-demo-records",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#C8283C",
      "circle-opacity": 0.85,
      "circle-radius": ["step", ["get", "point_count"], 12, 25, 16, 250, 21, 2500, 27],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#0B0909",
    },
  });

  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "jocasta-demo-records",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#EDE6DA" },
  });

  map.on("click", "clusters", async (event) => {
    const feature = event.features?.[0];
    const id = feature?.properties?.cluster_id;
    const source = map.getSource("jocasta-demo-records") as
      | GeoJSONSource
      | undefined;
    if (!source || typeof id !== "number" || feature?.geometry.type !== "Point") {
      return;
    }
    const zoom = await source.getClusterExpansionZoom(id);
    map.easeTo({
      center: feature.geometry.coordinates as [number, number],
      zoom,
    });
  });

  map.on("mouseenter", "clusters", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "clusters", () => {
    map.getCanvas().style.cursor = "";
  });

  for (const layer of LAYERS) {
    map.addLayer({
      id: layer.mapLayerId,
      type: "circle",
      source: "jocasta-demo-records",
      filter: [
        "all",
        ["!", ["has", "point_count"]],
        ["==", ["get", "kind"], layer.id],
      ],
      paint: {
        "circle-radius": 6,
        "circle-color": layer.color,
        "circle-opacity": 0.92,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#0B0909",
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
      const props = feature?.properties ?? {};
      const text = (key: string) =>
        typeof props[key] === "string" ? (props[key] as string) : "";

      const content = document.createElement("div");
      content.className = "jocasta-popup";

      const heading = document.createElement("strong");
      heading.textContent = text("label") || "Sample record";
      content.append(heading);

      // textContent only, the api data is never treated as html
      if (text("meta")) {
        const meta = document.createElement("span");
        meta.className = "jocasta-popup-meta";
        meta.textContent = text("meta");
        content.append(meta);
      }

      const detail = document.createElement("p");
      detail.textContent =
        text("detail") ||
        "Synthetic demonstration data. This is not a real-world event or live intelligence.";
      content.append(detail);

      if (text("source")) {
        const source = document.createElement("span");
        source.className = "jocasta-popup-source";
        source.textContent = `Source: ${text("source")}`;
        content.append(source);
      }

      new Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: "300px",
      })
        .setLngLat(event.lngLat)
        .setDOMContent(content)
        .addTo(map);
    });
  }
}

type WorldMapProps = {
  activeLayers: Record<LayerId, boolean>;
  records: SampleRecord[];
};

export default function WorldMap({ activeLayers, records }: WorldMapProps) {
  // the load handler only runs once, so it reads the latest records from here
  const recordsRef = useRef(records);

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
      hideBorders(map);
      addDemoMapLayers(map, recordsRef.current);
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

  useEffect(() => {
    recordsRef.current = records;
    if (!mapReady) {
      return;
    }
    const source = mapRef.current?.getSource("jocasta-demo-records") as
      | GeoJSONSource
      | undefined;
    // clusters mix every layer, so filter the data itself by the toggles
    source?.setData(toGeoJson(records.filter((r) => activeLayers[r.kind])));
  }, [records, activeLayers, mapReady]);

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
