"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import type { FeatureCollection } from "geojson";

type Coordinates = {
  latitude: string;
  longitude: string;
};

const manggaraiBaratCenter: [number, number] = [-8.496, 119.887];

function MoveToLocation({ coordinates }: { coordinates: Coordinates }) {
  const map = useMap();

  useEffect(() => {
    const latitude = Number(coordinates.latitude);
    const longitude = Number(coordinates.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      map.setView([latitude, longitude], 16);
    }
  }, [coordinates.latitude, coordinates.longitude, map]);

  return null;
}

function RefreshMapSize() {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 100);
    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

export default function LocationPicker({
  query,
  coordinates,
  onChange,
}: {
  query: string;
  coordinates: Coordinates;
  onChange: (coordinates: Coordinates) => void;
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [boundary, setBoundary] = useState<FeatureCollection | null>(null);
  const [basemap, setBasemap] = useState<"osm" | "satellite">("osm");
  const [searchInput, setSearchInput] = useState(() => query);
  const latitude = Number(coordinates.latitude);
  const longitude = Number(coordinates.longitude);
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);
  const center: [number, number] = hasLocation ? [latitude, longitude] : manggaraiBaratCenter;

  const basemapUrl =
    basemap === "osm"
      ? "https://tile.openstreetmap.de/{z}/{x}/{y}.png"
      : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  const basemapAttribution =
    basemap === "osm"
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      : 'Tiles &copy; Esri';

  useEffect(() => {
    fetch("/data/manggarai-barat.geojson")
      .then((response) => response.json() as Promise<FeatureCollection>)
      .then(setBoundary)
      .catch(() => setBoundary(null));
  }, []);

  const selectLocation = (nextLatitude: number, nextLongitude: number) => {
    onChange({ latitude: nextLatitude.toFixed(7), longitude: nextLongitude.toFixed(7) });
    setMessage("Titik lokasi tersimpan. Simpan formulir untuk menyimpannya.");
  };

  const searchAddress = async (addressOverride?: string) => {
    const targetAddress = (addressOverride ?? searchInput).trim();
    const searchQuery = targetAddress || query;

    if (!searchQuery.trim()) {
      setMessage("Lengkapi Kecamatan, Desa/Kelurahan, dan alamat terlebih dahulu.");
      return;
    }

    setIsSearching(true);
    setMessage("");
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(`${searchQuery}, Manggarai Barat, Indonesia`)}`, { headers: { Accept: "application/json" } });
      const result = (await response.json()) as { lat: string; lon: string; display_name?: string }[];
      if (!response.ok || !result[0]) {
        setMessage("Alamat belum ditemukan. Silakan periksa kembali nama jalan atau kelurahan.");
        return;
      }
      selectLocation(Number(result[0].lat), Number(result[0].lon));
      setMessage(`Alamat ditemukan: ${result[0].display_name ?? searchQuery}`);
    } catch {
      setMessage("Pencarian alamat gagal. Silakan coba kata kunci yang lain.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="md:col-span-2 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Lokasi LKS pada Peta</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">Cari alamat berdasarkan data di atas. Setelah ditemukan, sistem akan mengarahkan peta ke lokasi yang sesuai. Kabupaten tetap Manggarai Barat.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void searchAddress();
            }
          }}
          placeholder="Cari alamat, contoh: Jl. Pantai Binongko"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />
        <button type="button" onClick={() => void searchAddress()} disabled={isSearching} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:bg-slate-400">
          {isSearching ? "Mencari..." : "Cari"}
        </button>
      </div>

      <div className="mt-4 h-[330px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <div className="absolute left-3 top-3 z-[500] flex gap-2 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-sm">
          {[
            { key: "osm", label: "OpenStreetMap" },
            { key: "satellite", label: "Satelit" },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setBasemap(option.key as "osm" | "satellite")}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                basemap === option.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <MapContainer center={center} zoom={hasLocation ? 16 : 9} scrollWheelZoom className="h-full w-full">
          <TileLayer attribution={basemapAttribution} url={basemapUrl} />
          {boundary ? <GeoJSON data={boundary} pathOptions={{ color: "#2563eb", weight: 2, fillColor: "#60a5fa", fillOpacity: 0.08 }} /> : null}
          <MoveToLocation coordinates={coordinates} />
          <RefreshMapSize />
          {hasLocation ? <CircleMarker center={[latitude, longitude]} radius={10} pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.85 }} /> : null}
        </MapContainer>
      </div>

      <div className="mt-3 flex flex-col gap-1 text-xs text-slate-600">
        {hasLocation ? <span>Koordinat tersimpan: {coordinates.latitude}, {coordinates.longitude}</span> : <span>Belum ada titik lokasi tersimpan.</span>}
        <span>{message || "Gunakan pencarian alamat untuk menempatkan titik lokasi secara otomatis."}</span>
      </div>
    </div>
  );
}
