import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

export function DashboardTopBar({ pharmacy }: { pharmacy: Tables<"pharmacies"> }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await navigate({ to: "/" });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-status-ok-soft/45 px-6 py-4 dark:bg-status-ok-soft/15">
      <div>
        <h1 className="text-lg font-bold text-foreground">{pharmacy.name}</h1>
        <p className="text-sm text-muted-foreground">
          {[pharmacy.city, pharmacy.state].filter(Boolean).join(", ") || pharmacy.address}
        </p>
      </div>
      <Button variant="outline" onClick={handleLogout}>
        <LogOut className="size-4" />
        Logout
      </Button>
    </div>
  );
}