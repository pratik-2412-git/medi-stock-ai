import { useState, useRef, useEffect } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
 
interface MedicineSearchBarProps {
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  pincode: string;
  onPincodeChange: (v: string) => void;
  filterInStock: boolean;
  onFilterInStockChange: (v: boolean) => void;
  filterLowStock: boolean;
  onFilterLowStockChange: (v: boolean) => void;
  userLocation: { lat: number; lng: number } | null;
  locationMethod: "gps" | "pincode" | null;
  onGetLocation: () => void;
  isGettingLocation: boolean;
  locationError: string | null;
  allMedicines: Array<{ id: string; name: string }> | undefined;
  onSearch: () => void;
  onReset: () => void;
  submitted: boolean;
  isSearching: boolean;
}
 
export function MedicineSearchBar({
  searchQuery, onSearchQueryChange,
  pincode, onPincodeChange,
  filterInStock, onFilterInStockChange,
  filterLowStock, onFilterLowStockChange,
  userLocation, locationMethod, onGetLocation, isGettingLocation, locationError,
  allMedicines, onSearch, onReset, submitted, isSearching,
}: MedicineSearchBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
 
  const suggestions = (allMedicines ?? [])
    .filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()) && searchQuery.length > 0)
    .slice(0, 6);
 
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
 
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { setShowSuggestions(false); onSearch(); }
    if (e.key === "Escape") setShowSuggestions(false);
  };
 
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft space-y-4">
      {/* Search input */}
      <div ref={wrapperRef} className="relative">
        <Label htmlFor="med-search" className="text-sm font-medium text-foreground">
          Medicine Name
        </Label>
        <div className="relative mt-1.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            id="med-search"
            className="pl-9 pr-9 h-11 text-base"
            placeholder="Search medicine, e.g. Insulin or Metformin 500mg"
            value={searchQuery}
            onChange={(e) => { onSearchQueryChange(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => { onSearchQueryChange(""); onReset(); }}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
 
        {/* Autocomplete */}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-md overflow-hidden">
            {suggestions.map((m) => (
              <li key={m.id}>
                <button
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => {
                    onSearchQueryChange(m.name);
                    setShowSuggestions(false);
                    inputRef.current?.focus();
                  }}
                >
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
 
      {/* Location row */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-sm font-medium text-foreground">Your Location</Label>
          <div className="mt-1.5 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs"
              onClick={onGetLocation}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <MapPin className="size-3.5 mr-1" />
              )}
              {locationMethod === "gps"
                ? "Location set ✓"
                : isGettingLocation
                  ? "Locating..."
                  : "Use My Location"}
            </Button>
          </div>
          {locationError && (
            <p className="mt-1 text-xs text-status-critical-foreground">{locationError}</p>
          )}
          {locationMethod === "gps" && userLocation && (
            <p className="mt-1 text-xs text-status-ok-foreground">
              ✓ Using this location ({userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)})
            </p>
          )}
        </div>
 
        <div>
          <Label htmlFor="pincode" className="text-sm font-medium text-foreground">
            Pincode / Area
          </Label>
          <Input
            id="pincode"
            className="mt-1.5 h-9"
            placeholder="e.g. 700091"
            value={pincode}
            onChange={(e) => onPincodeChange(e.target.value)}
            maxLength={6}
          />
          {locationMethod === "pincode" && pincode.trim() && (
            <p className="mt-1 text-xs text-status-ok-foreground">✓ Using this pincode</p>
          )}
        </div>
      </div>
 
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Filters:</span>
        <FilterChip
          active={filterInStock}
          onClick={() => onFilterInStockChange(!filterInStock)}
          label="In Stock Only"
        />
        <FilterChip
          active={filterLowStock}
          onClick={() => onFilterLowStockChange(!filterLowStock)}
          label="Low Stock Only"
        />
      </div>
 
      {/* Search button */}
      <Button
        className="w-full h-10"
        onClick={onSearch}
        disabled={!searchQuery.trim() || isSearching}
      >
        {isSearching ? (
          <><Loader2 className="size-4 animate-spin mr-2" />Searching...</>
        ) : (
          <><Search className="size-4 mr-2" />Search Nearby Pharmacies</>
        )}
      </Button>
    </div>
  );
}
 
function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {label}
    </button>
  );
}