"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import type { FeatureCollection } from "geojson";

type MapRecord = {
  id: string;
  type: "LKS" | "LK3";
  label: string;
  detail: string;
  query: string;
  latitude?: number;
  longitude?: number;
};

type MapPoint = MapRecord & {
  latitude: number;
  longitude: number;
};

type GeocodeCache = Record<string, { latitude: number; longitude: number }>;

const CACHE_KEY = "si-inuk-psks-geocode-cache";
const defaultCenter: [number, number] = [-8.496, 119.887];

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 12);
      return;
    }
    map.fitBounds(points.map((point) => [point.latitude, point.longitude] as [number, number]), { padding: [30, 30] });
  }, [map, points]);

  return null;
}

async function geocode(record: MapRecord): Promise<MapPoint | null> {
  if (Number.isFinite(record.latitude) && Number.isFinite(record.longitude)) {
    return { ...record, latitude: record.latitude as number, longitude: record.longitude as number };
  }

  const cache = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "{}") as GeocodeCache;
  const cached = cache[record.query];
  if (cached) return { ...record, ...cached };

  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(record.query)}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;

  const result = (await response.json()) as { lat: string; lon: string }[];
  const first = result[0];
  if (!first) return null;

  const point = { latitude: Number(first.lat), longitude: Number(first.lon) };
  cache[record.query] = point;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  return { ...record, ...point };
}

export default function PsksMap({ records }: { records: MapRecord[] }) {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [unmapped, setUnmapped] = useState(0);
  const [loading, setLoading] = useState(false);
  const [boundary, setBoundary] = useState<FeatureCollection | null>(null);
  const [basemap, setBasemap] = useState<"light" | "satellite">("light");
  const [showArea, setShowArea] = useState(true);

  const basemapUrl =
    basemap === "light"
      ? "https://tile.openstreetmap.de/{z}/{x}/{y}.png"
      : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  const basemapAttribution =
    basemap === "light"
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      : 'Tiles &copy; Esri';

  useEffect(() => {
    fetch("/data/manggarai-barat.geojson")
      .then((response) => response.json() as Promise<FeatureCollection>)
      .then(setBoundary)
      .catch(() => setBoundary(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPoints = async () => {
      if (records.length === 0) {
        setPoints([]);
        setUnmapped(0);
        return;
      }

      setLoading(true);
      const resolved: MapPoint[] = [];
      let failed = 0;
      for (const record of records) {
        try {
          const point = await geocode(record);
          if (point) resolved.push(point);
          else failed += 1;
        } catch {
          failed += 1;
        }
      }
      if (!cancelled) {
        setPoints(resolved);
        setUnmapped(failed);
        setLoading(false);
      }
    };

    void loadPoints();
    return () => {
      cancelled = true;
    };
  }, [records]);

  return (
    <div>
      <div className="relative h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top,_#dfeafc_0%,_#edf3ff_30%,_#e6edf7_100%)] shadow-inner">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(148,163,184,0.08),rgba(255,255,255,0.2))]" />

        <div className="absolute left-3 top-3 z-[500] flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur-sm">
          <div className="flex gap-2">
            {[
              { key: "light", label: "Light" },
              { key: "satellite", label: "Satelit" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setBasemap(option.key as "light" | "satellite")}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                  basemap === option.key
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowArea((value) => !value)}
            className={`rounded-lg px-3 py-1.5 text-left text-[11px] font-medium transition ${
              showArea ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {showArea ? "Area kabupaten: ON" : "Area kabupaten: OFF"}
          </button>
        </div>

        <MapContainer center={defaultCenter} zoom={9} scrollWheelZoom className="relative z-0 h-full w-full">
          <TileLayer attribution={basemapAttribution} url={basemapUrl} />
          {showArea && boundary ? <GeoJSON data={boundary} pathOptions={{ color: "#2563eb", weight: 2, fillColor: "#60a5fa", fillOpacity: 0.08 }} /> : null}
          <FitBounds points={points} />
          {points.map((point) => (
            <CircleMarker
              key={point.id}
              center={[point.latitude, point.longitude]}
              radius={9}
              pathOptions={{ color: point.type === "LKS" ? "#047857" : "#7c3aed", fillColor: point.type === "LKS" ? "#10b981" : "#8b5cf6", fillOpacity: 0.8 }}
            >
              <Popup>
                <strong>{point.type}: {point.label}</strong>
                <br />
                {point.detail}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {loading ? <p className="absolute left-4 top-28 z-[500] rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-slate-600 shadow">Mencari lokasi berdasarkan alamat/wilayah...</p> : null}
        {!loading && records.length === 0 ? (
          <div className="absolute inset-0 z-[400] flex items-center justify-center bg-slate-900/5 backdrop-blur-[1px]">
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-700">Belum ada data real untuk ditampilkan</p>
              <p className="mt-1 text-xs text-slate-500">Peta akan muncul setelah data LKS atau LK3 aktif tersimpan.</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-2 font-medium">
            <i className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            LKS
          </span>
          <span className="inline-flex items-center gap-2 font-medium">
            <i className="inline-block h-2.5 w-2.5 rounded-full bg-violet-500" />
            LK3
          </span>
          <span className="inline-flex items-center gap-2 font-medium">
            <i className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
            Area kabupaten
          </span>
          <span className="ml-auto text-slate-500">{points.length} lokasi tampil</span>
        </div>
        {unmapped > 0 ? <p className="mt-2 text-[11px] font-medium text-amber-700">{unmapped} lokasi belum ditemukan dari alamat/wilayah yang tersimpan.</p> : null}
      </div>
    </div>
  );
}
