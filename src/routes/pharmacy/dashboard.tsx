import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  usePharmacyRecord,
  usePharmacyStock,
  usePharmacyPredictions,
  usePharmacyAlerts,
} from "@/hooks/usePharmacyDashboard";
import { PharmacyOnboarding } from "@/components/pharmacy/PharmacyOnboarding";
import { DashboardTopBar } from "@/components/pharmacy/DashboardTopBar";
import { SummaryCardsEnhanced } from "@/components/pharmacy/SummaryCardsEnhanced";
import { AlertsPanelEnhanced } from "@/components/pharmacy/AlertsPanelEnhanced";
import { MedicineTableEnhanced } from "@/components/pharmacy/MedicineTableEnhanced";

const title = "Pharmacy Dashboard — MediStock AI";
const description =
  "Monitor medicine stock levels, shortage predictions and alerts for your pharmacy.";

export const Route = createFileRoute("/pharmacy/dashboard")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PharmacyDashboard,
});

function PharmacyDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: userLoading } = useAuth();

  useEffect(() => {
    if (!userLoading && !user) {
      navigate({
        to: "/auth",
        search: { mode: "login", role: "pharmacy" },
      });
    }
  }, [userLoading, user, navigate]);

  const pharmacyId = profile?.pharmacy_id ?? null;

  const { data: pharmacy, isLoading: pharmacyLoading } = usePharmacyRecord(pharmacyId);
  const { data: stock, isLoading: stockLoading } = usePharmacyStock(pharmacyId);
  const { data: predictions, isLoading: predictionsLoading } = usePharmacyPredictions(pharmacyId);
  const { data: alerts, isLoading: alertsLoading } = usePharmacyAlerts(pharmacyId);

  if (userLoading) return <CenteredMessage text="Loading..." />;
  if (!user) return <CenteredMessage text="Redirecting to login..." />;

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

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <SummaryCardsEnhanced
          stock={stock ?? []}
          predictions={predictions ?? []}
          isLoading={isLoadingData}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MedicineTableEnhanced
              pharmacyId={pharmacy.id}
              stock={stock ?? []}
              predictions={predictions ?? []}
              isLoading={isLoadingData}
            />
          </div>

          <div>
            <AlertsPanelEnhanced
              alerts={alerts ?? []}
              isLoading={isLoadingData}
              pharmacyId={pharmacy.id}
            />
          </div>
        </div>
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