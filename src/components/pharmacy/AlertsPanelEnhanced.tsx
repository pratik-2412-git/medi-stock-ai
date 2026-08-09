/*import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BellOff, CheckCheck, ChevronDown, ChevronUp, AlertCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { AlertRow } from "@/hooks/usePharmacyDashboard";
 
const severityConfig: Record<string, {
  icon: React.FC<{ className?: string }>;
  badgeClass: string;
  rowClass: string;
}> = {
  Critical: {
    icon: XCircle,
    badgeClass: "border-status-critical text-status-critical-foreground bg-status-critical-soft",
    rowClass: "border-l-2 border-l-status-critical",
  },
  High: {
    icon: XCircle,
    badgeClass: "border-status-critical text-status-critical-foreground bg-status-critical-soft",
    rowClass: "border-l-2 border-l-status-critical",
  },
  Medium: {
    icon: AlertTriangle,
    badgeClass: "border-status-warn text-status-warn-foreground bg-status-warn-soft",
    rowClass: "border-l-2 border-l-status-warn",
  },
  Low: {
    icon: AlertCircle,
    badgeClass: "border-border text-muted-foreground",
    rowClass: "",
  },
};
 
interface AlertsPanelEnhancedProps {
  alerts: AlertRow[];
  isLoading?: boolean;
  pharmacyId: string;
}
 
export function AlertsPanelEnhanced({ alerts, isLoading = false, pharmacyId }: AlertsPanelEnhancedProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const unread = alerts.filter((a) => !a.is_read);
  const displayed = expanded ? alerts : alerts.slice(0, 5);
 
  const markAllRead = useMutation({
    mutationFn: async () => {
      const ids = unread.map((a) => a.id);
      if (ids.length === 0) return;
      const { error } = await supabase.from("alerts").update({ is_read: true }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All alerts marked as read");
      queryClient.invalidateQueries({ queryKey: ["alerts", pharmacyId] });
    },
    onError: () => toast.error("Failed to mark alerts as read"),
  });
 
  const markOneRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alerts").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts", pharmacyId] }),
  });
 
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-status-warn-foreground" />
            Alerts
            {unread.length > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-status-critical text-[10px] font-bold text-white">
                {unread.length}
              </span>
            )}
          </CardTitle>
          {unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="size-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
 
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                <Skeleton className="size-4 mt-0.5 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <BellOff className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No active alerts. You're all caught up!</p>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {displayed.map((alert) => {
                const cfg = severityConfig[alert.severity] ?? severityConfig.Low;
                const Icon = cfg.icon;
                return (
                  <li
                    key={alert.id}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-opacity ${cfg.rowClass} ${
                      alert.is_read ? "opacity-50" : "bg-card"
                    }`}
                  >
                    <Icon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight">{alert.title}</p>
                      {alert.message && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(alert.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.badgeClass}`}>
                        {alert.severity}
                      </Badge>
                      {!alert.is_read && (
                        <button
                          className="text-[10px] text-primary hover:underline"
                          onClick={() => markOneRead.mutate(alert.id)}
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
 
            {alerts.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <><ChevronUp className="size-3.5 mr-1" />Show less</>
                ) : (
                  <><ChevronDown className="size-3.5 mr-1" />Show {alerts.length - 5} more</>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
*/
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, BellOff, CheckCheck, ChevronDown, ChevronUp, AlertCircle, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { AlertRow } from "@/hooks/usePharmacyDashboard";

type SeverityKey = "Critical" | "High" | "Medium" | "Low";

interface SeverityCfg {
  icon: React.FC<{ className?: string }>;
  badgeClass: string;
  rowClass: string;
}

const severityConfig: Record<SeverityKey, SeverityCfg> = {
  Critical: {
    icon: XCircle,
    badgeClass: "border-status-critical text-status-critical-foreground bg-status-critical-soft",
    rowClass: "border-l-2 border-l-status-critical",
  },
  High: {
    icon: XCircle,
    badgeClass: "border-status-critical text-status-critical-foreground bg-status-critical-soft",
    rowClass: "border-l-2 border-l-status-critical",
  },
  Medium: {
    icon: AlertTriangle,
    badgeClass: "border-status-warn text-status-warn-foreground bg-status-warn-soft",
    rowClass: "border-l-2 border-l-status-warn",
  },
  Low: {
    icon: AlertCircle,
    badgeClass: "border-border text-muted-foreground",
    rowClass: "",
  },
};

const fallbackCfg: SeverityCfg = severityConfig["Low"];

function isSeverityKey(s: string): s is SeverityKey {
  return s === "Critical" || s === "High" || s === "Medium" || s === "Low";
}

interface AlertsPanelEnhancedProps {
  alerts: AlertRow[];
  isLoading?: boolean;
  pharmacyId: string;
}

export function AlertsPanelEnhanced({ alerts, isLoading = false, pharmacyId }: AlertsPanelEnhancedProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const unread = alerts.filter((a) => !a.is_read);
  const displayed = expanded ? alerts : alerts.slice(0, 5);

  const markAllRead = useMutation({
    mutationFn: async () => {
      const ids = unread.map((a) => a.id);
      if (ids.length === 0) return;
      const { error } = await supabase.from("alerts").update({ is_read: true }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All alerts marked as read");
      queryClient.invalidateQueries({ queryKey: ["alerts", pharmacyId] });
    },
    onError: () => toast.error("Failed to mark alerts as read"),
  });

  const markOneRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alerts").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts", pharmacyId] }),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-status-warn-foreground" />
            Alerts
            {unread.length > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-status-critical text-[10px] font-bold text-white">
                {unread.length}
              </span>
            )}
          </CardTitle>
          {unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="size-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                <Skeleton className="size-4 mt-0.5 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <BellOff className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No active alerts. You're all caught up!</p>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {displayed.map((alert) => {
                const cfg: SeverityCfg = isSeverityKey(alert.severity)
                  ? severityConfig[alert.severity]
                  : fallbackCfg;
                const Icon = cfg.icon;
                return (
                  <li
                    key={alert.id}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-opacity ${cfg.rowClass} ${
                      alert.is_read ? "opacity-50" : "bg-card"
                    }`}
                  >
                    <Icon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight">{alert.title}</p>
                      {alert.message && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(alert.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.badgeClass}`}>
                        {alert.severity}
                      </Badge>
                      {!alert.is_read && (
                        <button
                          className="text-[10px] text-primary hover:underline"
                          onClick={() => markOneRead.mutate(alert.id)}
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {alerts.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <><ChevronUp className="size-3.5 mr-1" />Show less</>
                ) : (
                  <><ChevronDown className="size-3.5 mr-1" />Show {alerts.length - 5} more</>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}