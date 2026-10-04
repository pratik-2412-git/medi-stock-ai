import { useEffect, useRef } from "react";
import type { PharmacyResult } from "@/hooks/useMedicineSearch";
import { classifyStockLevel } from "@/lib/stock-thresholds";

interface PharmacyMapProps {
  results: PharmacyResult[];
  userLocation: { lat: number; lng: number } | null;
  selectedId: string | null;
  onSelectPharmacy: (id: string) => void;
}

function getMarkerColor(result: PharmacyResult): string {
  const level = classifyStockLevel(result.quantity);
  if (level === "out") return "#ef4444";
  if (level === "low") return "#f59e0b";
  return "#22c55e";
}

function formatTime(t: string | null): string {
  if (!t) return "—";
  const parts = t.split(":");
  const hour = parseInt(parts[0] ?? "0", 10);
  const min = parts[1] ?? "00";
  return `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${min} ${hour < 12 ? "AM" : "PM"}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletLib = any;

export function PharmacyMap({
  results,
  userLocation,
  selectedId,
  onSelectPharmacy,
}: PharmacyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Array<{ marker: any; id: string }>>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const loadLeaflet = (): Promise<LeafletLib> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).L) return Promise.resolve((window as any).L as LeafletLib);
      return new Promise<LeafletLib>((resolve) => {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        script.onload = () => resolve((window as any).L as LeafletLib);
        document.head.appendChild(script);
      });
    };

    void loadLeaflet().then((L: LeafletLib) => {
      if (mapInstanceRef.current || !mapRef.current) return;

      let center: [number, number] = [22.5726, 88.4312]; // default: Kolkata
      if (userLocation) {
        center = [userLocation.lat, userLocation.lng];
      } else {
        const first = results.find((r) => r.latitude !== null && r.longitude !== null);
        if (first && first.latitude !== null && first.longitude !== null) {
          center = [first.latitude, first.longitude];
        }
      }

      const map = L.map(mapRef.current, { zoomControl: true }).setView(center, 12);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      if (userLocation) {
        const userIcon = L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 2px #3b82f6;"></div>`,
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup("<b>Your Location</b>");
      }

      markersRef.current = results
        .filter(
          (r): r is PharmacyResult & { latitude: number; longitude: number } =>
            r.latitude !== null && r.longitude !== null,
        )
        .map((r) => {
          const color = getMarkerColor(r);

          const icon = L.divIcon({
            html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;"></div>`,
            className: "",
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });

          const level = classifyStockLevel(r.quantity);
          const stockLabel =
            level === "out"
              ? "Out of Stock"
              : level === "low"
                ? `Low Stock (${r.quantity} units)`
                : `In Stock (${r.quantity} units)`;

          const popup = `
            <div style="min-width:180px;font-family:system-ui,sans-serif;">
              <b style="font-size:13px;">${r.pharmacyName}</b><br>
              <span style="font-size:11px;color:#666;">${[r.address, r.city].filter(Boolean).join(", ")}</span><br>
              <span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600;background:${color}22;color:${color};border:1px solid ${color};">
                ${stockLabel}
              </span><br>
              ${r.phone ? `<a href="tel:${r.phone}" style="font-size:11px;color:#3b82f6;margin-top:4px;display:block;">📞 ${r.phone}</a>` : ""}
              <div style="font-size:10px;color:#888;margin-top:2px;">
                ${formatTime(r.openingTime)} – ${formatTime(r.closingTime)}
              </div>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}" target="_blank" style="font-size:11px;color:#3b82f6;margin-top:4px;display:block;">↗ Get Directions</a>
            </div>
          `;

          const marker = L.marker([r.latitude, r.longitude], { icon }).addTo(map).bindPopup(popup);

          marker.on("click", () => onSelectPharmacy(r.pharmacyId));
          return { marker, id: r.pharmacyId };
        });

      const validCoords = results.filter(
        (r): r is PharmacyResult & { latitude: number; longitude: number } =>
          r.latitude !== null && r.longitude !== null,
      );
      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords.map((r) => [r.latitude, r.longitude]));
        if (userLocation) {
          bounds.extend([userLocation.lat, userLocation.lng]);
        }

        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = [];
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId || !mapInstanceRef.current) return;
    const entry = markersRef.current.find((m) => m.id === selectedId);
    if (entry) {
      entry.marker.openPopup();

      mapInstanceRef.current.panTo(entry.marker.getLatLng());
    }
  }, [selectedId]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border">
      <div ref={mapRef} className="h-[400px] w-full" />
      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 rounded-lg border bg-white/90 p-2 text-xs shadow-soft backdrop-blur dark:bg-card/90">
        <LegendItem color="#22c55e" label="In Stock (6+ units)" />
        <LegendItem color="#f59e0b" label="Low Stock (1–5 units)" />
        <LegendItem color="#ef4444" label="Out of Stock" />
        <LegendItem color="#3b82f6" label="Your location" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        style={{ background: color }}
        className="h-3 w-3 shrink-0 rounded-full border-2 border-white shadow-sm"
      />
      <span className="text-foreground">{label}</span>
    </div>
  );
}