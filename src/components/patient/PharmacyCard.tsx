import { useState } from "react";
import { Phone, MapPin, Clock, Navigation, Bell, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PharmacyResult } from "@/hooks/useMedicineSearch";
import type { ShortageClass } from "@/lib/shortage";

type StockStatus = "safe" | "low" | "out";

const stockStatusConfig: Record<StockStatus, { label: string; class: string; dot: string }> = {
  safe: {
    label: "In Stock",
    class: "bg-status-ok-soft text-status-ok-foreground border-status-ok",
    dot: "bg-status-ok",
  },
  low: {
    label: "Low Stock",
    class: "bg-status-warn-soft text-status-warn-foreground border-status-warn",
    dot: "bg-status-warn",
  },
  out: {
    label: "Out of Stock",
    class: "bg-status-critical-soft text-status-critical-foreground border-status-critical",
    dot: "bg-status-critical",
  },
};

function getStockStatus(shortageClass: ShortageClass, quantity: number): StockStatus {
  if (quantity === 0) return "out";
  if (shortageClass === "High" || shortageClass === "Medium") return "low";
  return "safe";
}

function formatTime(t: string | null): string {
  if (!t) return "—";
  const parts = t.split(":");
  const hour = parseInt(parts[0] ?? "0", 10);
  const min = parts[1] ?? "00";
  return `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${min} ${hour < 12 ? "AM" : "PM"}`;
}

interface PharmacyCardProps {
  result: PharmacyResult;
  isSelected?: boolean;
  onClick?: () => void;
}

export function PharmacyCard({ result, isSelected, onClick }: PharmacyCardProps) {
  const [notified, setNotified] = useState(false);
  const status = getStockStatus(result.shortageClass, result.quantity);
  const cfg = stockStatusConfig[status];

  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (result.latitude !== null && result.longitude !== null) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${result.latitude},${result.longitude}`,
        "_blank",
      );
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${result.pharmacyName} ${result.address} ${result.city}`,
        )}`,
        "_blank",
      );
    }
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (result.phone) window.location.href = `tel:${result.phone}`;
  };

  const handleNotify = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotified(true);
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-primary shadow-lift" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground leading-tight">{result.pharmacyName}</h3>
              {result.distance !== null && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {result.distance < 1
                    ? `${Math.round(result.distance * 1000)}m`
                    : `${result.distance.toFixed(1)}km`}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">
                {[result.address, result.city, result.state].filter(Boolean).join(", ")}
              </span>
            </div>
            {(result.openingTime ?? result.closingTime) && (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3 shrink-0" />
                <span>
                  {formatTime(result.openingTime)} – {formatTime(result.closingTime)}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge variant="outline" className={`text-xs ${cfg.class}`}>
              <span className={`size-1.5 rounded-full mr-1.5 inline-block ${cfg.dot}`} />
              {cfg.label}
            </Badge>
            {result.quantity > 0 && (
              <span className="text-xs text-muted-foreground">{result.quantity} units</span>
            )}
            {result.shortageClass !== "None" &&
              result.predictedDays !== null &&
              result.quantity > 0 && (
                <span className="text-xs text-status-warn-foreground">
                  ~{result.predictedDays}d left
                </span>
              )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {result.phone && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleCall}>
              <Phone className="size-3" />
              Call
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={handleDirections}
          >
            <Navigation className="size-3" />
            Directions
          </Button>
          {status === "out" && (
            <Button
              size="sm"
              variant={notified ? "secondary" : "outline"}
              className="h-7 text-xs gap-1 ml-auto"
              onClick={handleNotify}
              disabled={notified}
            >
              {notified ? (
                <>
                  <CheckCircle2 className="size-3 text-status-ok" />
                  Notified
                </>
              ) : (
                <>
                  <Bell className="size-3" />
                  Notify me
                </>
              )}
            </Button>
          )}
        </div>

        {notified && (
          <div className="mt-2 rounded-md bg-status-ok-soft px-3 py-1.5 text-xs text-status-ok-foreground">
            ✓ You'll be notified when this medicine is back in stock.
          </div>
        )}
      </CardContent>
    </Card>
  );
}