import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useCurrentUser, useProfile } from "@/hooks/useProfile";
import {
  usePharmacyRecord,
  usePharmacyStock,
  usePharmacyPredictions,
  usePharmacyAlerts,
} from "@/hooks/usePharmacyDashboard";
import { PharmacyOnboarding } from "@/components/pharmacy/PharmacyOnboarding";
import { DashboardTopBar } from "@/components/pharmacy/DashboardTopBar";
import { SummaryCards } from "@/components/pharmacy/SummaryCards";
import { AlertsPanel } from "@/components/pharmacy/AlertsPanel";
import { MedicineTable } from "@/components/pharmacy/MedicineTable";

const title = "Pharmacy Dashboard — MediStock AI";

export const Route = createFileRoute("/pharmacy/dashboard")({
  head: () => ({
    meta: [{ title }],
  }),
  component: PharmacyDashboard,
});

function PharmacyDashboard() {
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);

  useEffect(() => {
    if (!userLoading && !user) {
      navigate({ to: "/auth", search: { mode: "login", role: "pharmacy" } });
    }
  }, [userLoading, user, navigate]);

  const pharmacyId = profile?.pharmacy_id ?? null;
  const { data: pharmacy, isLoading: pharmacyLoading } = usePharmacyRecord(pharmacyId);
  const { data: stock, isLoading: stockLoading } = usePharmacyStock(pharmacyId);
  const { data: predictions, isLoading: predictionsLoading } = usePharmacyPredictions(pharmacyId);
  const { data: alerts, isLoading: alertsLoading } = usePharmacyAlerts(pharmacyId);

  if (userLoading || profileLoading) {
    return <CenteredMessage text="Loading..." />;
  }

  if (!user) {
    return <CenteredMessage text="Redirecting to login..." />;
  }

  if (profile && profile.role !== "pharmacy") {
    return (
      <CenteredMessage text="This dashboard is for pharmacy owner accounts. Please log in with a pharmacy account." />
    );
  }

  if (profile && !profile.pharmacy_id) {
    return <PharmacyOnboarding userId={user.id} />;
  }

  if (pharmacyLoading || !pharmacy) {
    return <CenteredMessage text="Loading your pharmacy..." />;
  }

  const isLoadingData = stockLoading || predictionsLoading || alertsLoading;

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopBar pharmacy={pharmacy} />
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {isLoadingData ? (
          <CenteredMessage text="Loading dashboard..." />
        ) : (
          <>
            <SummaryCards stock={stock ?? []} predictions={predictions ?? []} />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <MedicineTable
                  pharmacyId={pharmacy.id}
                  stock={stock ?? []}
                  predictions={predictions ?? []}
                />
              </div>
              <div>
                <AlertsPanel alerts={alerts ?? []} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
