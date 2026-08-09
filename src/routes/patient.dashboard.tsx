import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuth, dashboardPathForRole } from "@/hooks/use-auth";

const title = "Patient Dashboard — MediStock AI";
const description =
  "Search medicines and see which nearby pharmacies have them in stock right now.";

export const Route = createFileRoute("/patient/dashboard")({
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
  component: PatientDashboard,
});

function PatientDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { mode: "login", role: "patient" } });
      return;
    }
    if (profile && profile.role !== "patient") {
      navigate({ to: dashboardPathForRole(profile.role) });
    }
  }, [loading, user, profile, navigate]);

  if (loading || !user || (profile && profile.role !== "patient")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Search for a medicine to find pharmacies that have it in stock nearby.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <p className="text-sm text-muted-foreground">
            The medicine search &amp; map experience goes here.
          </p>
        </div>
      </div>
    </div>
  );
}
