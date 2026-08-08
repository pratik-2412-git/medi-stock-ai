import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const title = "Login or Sign Up — MediStock AI";
const description =
  "Access MediStock AI as a patient or pharmacy owner to track medicine stock and shortage alerts.";

type Role = "patient" | "pharmacy";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search["mode"] === "login" ? ("login" as const) : ("signup" as const),
    role: search["role"] === "pharmacy" ? ("pharmacy" as const) : ("patient" as const),
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, role: initialRole } = Route.useSearch();
  const navigate = useNavigate();

  const isLogin = mode === "login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>(initialRole);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back to MediStock AI");
        await navigate({ to: "/" });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, phone, role },
        },
      });
      if (error) throw error;

      if (data.session) {
        toast.success("Account created");
        await navigate({ to: "/" });
      } else {
        toast.success("Check your email to confirm your account");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
        <Link to="/" className="text-sm font-semibold text-primary">
          MediStock AI
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
          {isLogin ? "Log in to your account" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isLogin
            ? "Use your email and password to continue."
            : "Sign up as a patient or a pharmacy owner."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>I am a</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["patient", "pharmacy"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRole(option)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                        role === option
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {option === "patient" ? "Patient" : "Pharmacy owner"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Log in" : "Sign up"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isLogin ? "New to MediStock AI?" : "Already have an account?"}{" "}
          <Link
            to="/auth"
            search={{ mode: isLogin ? "signup" : "login", role }}
            className="font-semibold text-primary hover:underline"
          >
            {isLogin ? "Sign up" : "Log in"}
          </Link>
        </p>
      </div>
    </div>
  );
}
