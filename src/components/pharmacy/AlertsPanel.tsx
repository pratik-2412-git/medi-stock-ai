import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AlertRow } from "@/hooks/usePharmacyDashboard";

export function AlertsPanel({ alerts }: { alerts: AlertRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-status-warn-foreground" />
          Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active alerts. You're all caught up.</p>
        ) : (
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  {alert.message && (
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={
                    alert.severity === "High" || alert.severity === "Critical"
                      ? "border-status-critical text-status-critical-foreground"
                      : "border-status-warn text-status-warn-foreground"
                  }
                >
                  {alert.severity}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
