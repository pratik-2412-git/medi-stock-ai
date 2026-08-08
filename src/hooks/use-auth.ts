import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type Role = "patient" | "pharmacy";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: Role;
  pharmacy_id: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

/**
 * Client-side auth hook.
 * Loads the current Supabase session + the matching `profiles` row,
 * and keeps both in sync with auth state changes (login/logout/refresh).
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function loadProfile(session: Session | null) {
      if (!session?.user) {
        if (active) setState({ session: null, user: null, profile: null, loading: false });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, phone, role, pharmacy_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (active) {
        setState({
          session,
          user: session.user,
          profile: (profile as Profile) ?? null,
          loading: false,
        });
      }
    }

    supabase.auth.getSession().then(({ data }) => loadProfile(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({ ...prev, loading: true }));
      loadProfile(session);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function dashboardPathForRole(role: Role) {
  return role === "pharmacy" ? "/pharmacy/dashboard" : "/patient/dashboard";
}
