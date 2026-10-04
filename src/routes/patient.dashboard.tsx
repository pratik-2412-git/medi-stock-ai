import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";

import { useAuth, dashboardPathForRole } from "@/hooks/use-auth";
import { useMedicineSearch } from "@/hooks/useMedicineSearch";
import { MedicineSearchBar } from "@/components/patient/MedicineSearchBar";
import { PharmacyCard } from "@/components/patient/PharmacyCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, SearchX, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { PharmacyResult } from "@/hooks/useMedicineSearch";

const PharmacyMap = lazy(() =>
  import("@/components/patient/PharmacyMap").then((m) => ({ default: m.PharmacyMap })),
);

const title = "Patient Dashboard — MediStock AI";

export const Route = createFileRoute("/patient/dashboard")({
  head: () => ({ meta: [{ title }] }),
  component: PatientDashboard,
});

function PatientDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  const {
    searchQuery,
    setSearchQuery,
    userLocation,
    searchOrigin,
    locationMethod,
    pincode,
    setPincode,
    filterInStock,
    setFilterInStock,
    filterLowStock,
    setFilterLowStock,
    locationError,
    isGettingLocation,
    allMedicines,
    results,
    isSearching,
    searchError,
    submitted,
    handleSearch,
    handleReset,
    getLocation,
  } = useMedicineSearch();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: "/auth", search: { mode: "login", role: "patient" } });
      return;
    }
    if (profile && profile.role !== "patient") {
      void navigate({ to: dashboardPathForRole(profile.role) });
    }
  }, [loading, user, profile, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await navigate({ to: "/" });
  };

  if (loading || !user || (profile && profile.role !== "patient")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const hasMapData = results.some(
    (r: PharmacyResult) => r.latitude !== null && r.longitude !== null,
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-secondary/45 px-5 py-4 backdrop-blur dark:bg-secondary/15">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-foreground">
              Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
            </h1>
            <p className="text-xs text-muted-foreground">Find medicines at nearby pharmacies</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
        {/* Search */}
        <MedicineSearchBar
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          pincode={pincode}
          onPincodeChange={setPincode}
          filterInStock={filterInStock}
          onFilterInStockChange={setFilterInStock}
          filterLowStock={filterLowStock}
          onFilterLowStockChange={setFilterLowStock}
          userLocation={userLocation}
          locationMethod={locationMethod}
          onGetLocation={getLocation}
          isGettingLocation={isGettingLocation}
          locationError={locationError}
          allMedicines={allMedicines}
          onSearch={() => void handleSearch()}
          onReset={handleReset}
          submitted={submitted}
          isSearching={isSearching}
        />

        {/* Error */}
        {searchError && (
          <div className="rounded-lg border border-status-critical bg-status-critical-soft p-4 text-sm text-status-critical-foreground">
            Something went wrong while searching. Please try again.
          </div>
        )}

        {/* Results */}
        {submitted && (
          <>
            {isSearching ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-64" />
                    <Skeleton className="h-3 w-40" />
                    <div className="flex gap-2 mt-2">
                      <Skeleton className="h-7 w-16 rounded-md" />
                      <Skeleton className="h-7 w-24 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                  <SearchX className="size-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">No pharmacies found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try a different medicine name, remove filters, or expand your area.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Result count + map toggle */}
                {hasMapData && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {results.length} pharmacie{results.length !== 1 ? "s" : ""} found
                      {searchOrigin ? " within 10km" : ""}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setShowMap(!showMap)}>
                      <MapPin className="size-3.5 mr-1" />
                      {showMap ? "Hide Map" : "Show Map"}
                    </Button>
                  </div>
                )}

                {/* Map */}
                {showMap && hasMapData && (
                  <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
                    <PharmacyMap
                      results={results}
                      userLocation={searchOrigin}
                      selectedId={selectedPharmacyId}
                      onSelectPharmacy={setSelectedPharmacyId}
                    />
                  </Suspense>
                )}

                {/* Legend */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <StatusChip color="ok" label="In Stock" />
                  <StatusChip color="warn" label="Low Stock" />
                  <StatusChip color="critical" label="Out of Stock" />
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {results.map((r: PharmacyResult) => (
                    <PharmacyCard
                      key={r.pharmacyId}
                      result={r}
                      isSelected={selectedPharmacyId === r.pharmacyId}
                      onClick={() => {
                        setSelectedPharmacyId(r.pharmacyId);
                        if (!showMap && hasMapData) setShowMap(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Pre-search empty state */}
        {!submitted && (
          <div className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary-soft">
              <MapPin className="size-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Search for a medicine</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Enter a medicine name above and we'll find pharmacies near you that have it in
                stock.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatusChip({ color, label }: { color: string; label: string }) {
  const bgMap: Record<string, string> = {
    ok: "bg-status-ok-soft text-status-ok-foreground",
    warn: "bg-status-warn-soft text-status-warn-foreground",
    critical: "bg-status-critical-soft text-status-critical-foreground",
  };
  const dotMap: Record<string, string> = {
    ok: "bg-status-ok",
    warn: "bg-status-warn",
    critical: "bg-status-critical",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${bgMap[color] ?? ""}`}
    >
      <span className={`size-1.5 rounded-full ${dotMap[color] ?? ""}`} />
      {label}
    </span>
  );
}