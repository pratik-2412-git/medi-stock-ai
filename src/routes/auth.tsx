import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, MapPin } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createPharmacyForUser,
  flushPendingPharmacy,
  savePendingPharmacy,
  type PendingPharmacy,
} from "@/lib/pharmacy-signup";

const title = "Login or Sign Up — MediStock AI";
const description =
  "Access MediStock AI as a patient or pharmacy owner to track medicine stock and shortage alerts.";

type Role = "patient" | "pharmacy";
type Mode = "login" | "signup" | "forgot" | "reset";

const VALID_MODES: readonly Mode[] = ["login", "signup", "forgot", "reset"];

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (VALID_MODES.includes(search["mode"] as Mode) ? (search["mode"] as Mode) : "signup"),
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

/** Password input with a show/hide eye-icon toggle. Same visual style as <Input />. */
function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function AuthPage() {
  const { mode, role: initialRole } = Route.useSearch();
  const navigate = useNavigate();

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const isReset = mode === "reset";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>(initialRole);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Pharmacy-owner signup fields
  const [pharmacyName, setPharmacyName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported by this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(Number(position.coords.latitude.toFixed(6)));
        setLongitude(Number(position.coords.longitude.toFixed(6)));
        setLocating(false);
        toast.success("Location captured");
      },
      () => {
        setLocating(false);
        toast.error("Could not get your location — you can enter it manually");
      },
    );
  };

  // For the "reset" mode: the Supabase password-reset email links back here
  // with recovery tokens in the URL. The Supabase client picks those up
  // automatically and establishes a temporary recovery session — we just
  // need to wait for (and confirm) that before allowing a new password.
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    if (!isReset) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) setRecoveryReady(true);
      setRecoveryChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setRecoveryReady(true);
        setRecoveryChecked(true);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [isReset]);

  const redirectByRole = async (userId: string | undefined) => {
    if (!userId) {
      await navigate({ to: "/patient/dashboard" });
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.role === "pharmacy") {
      await flushPendingPharmacy(userId);
      await navigate({ to: "/pharmacy/dashboard" });
    } else {
      // Both "patient" role and any unrecognised role go to the patient dashboard
      await navigate({ to: "/patient/dashboard" });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=reset`,
        });
        if (error) throw error;
        setForgotSent(true);
        toast.success("Password reset email sent — check your inbox");
        return;
      }

      if (isReset) {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }
        const { data, error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated — you're logged in");
        await redirectByRole(data.user?.id);
        return;
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back to MediStock AI");
        await redirectByRole(data.user?.id);
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

      const pharmacyDetails: PendingPharmacy | null =
        role === "pharmacy"
          ? {
            name: pharmacyName,
            owner_name: fullName || null,
            phone: phone || null,
            address: address || null,
            city: city || null,
            state: stateName || null,
            pincode: pincode || null,
            latitude,
            longitude,
          }
          : null;

      if (data.session) {
        if (pharmacyDetails && data.user) {
          await createPharmacyForUser(data.user.id, pharmacyDetails);
        }
        toast.success("Account created");
        await redirectByRole(data.user?.id);
      } else {
        // Email confirmation pending: keep the pharmacy details for the first sign-in.
        if (pharmacyDetails) savePendingPharmacy(pharmacyDetails);
        toast.success("Check your email to confirm your account");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const heading = isForgot
    ? "Reset your password"
    : isReset
      ? "Choose a new password"
      : isLogin
        ? "Log in to your account"
        : "Create your account";

  const subheading = isForgot
    ? "Enter your email and we'll send you a link to reset your password."
    : isReset
      ? "Enter a new password for your account below."
      : isLogin
        ? "Use your email and password to continue."
        : "Sign up as a patient or a pharmacy owner.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
        <Link to="/" className="text-sm font-semibold text-primary">
          MediStock AI
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">{heading}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subheading}</p>

        {/* Forgot password: email entry, then a confirmation message. */}
        {isForgot && (
          forgotSent ? (
            <div className="mt-6 space-y-4">
              <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-foreground">
                If an account exists for <span className="font-medium">{email}</span>, a
                password reset link is on its way. Check your inbox (and spam folder).
              </p>
              <Link
                to="/auth"
                search={{ mode: "login", role }}
                className="block text-center text-sm font-semibold text-primary hover:underline"
              >
                Back to log in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link
                  to="/auth"
                  search={{ mode: "login", role }}
                  className="font-semibold text-primary hover:underline"
                >
                  Back to log in
                </Link>
              </p>
            </form>
          )
        )}

        {/* Reset password: only shown once a valid recovery session is confirmed. */}
        {isReset && (
          !recoveryChecked ? (
            <p className="mt-6 text-sm text-muted-foreground">Verifying your reset link...</p>
          ) : !recoveryReady ? (
            <div className="mt-6 space-y-4">
              <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                This reset link is invalid or has expired. Please request a new one.
              </p>
              <Link
                to="/auth"
                search={{ mode: "forgot", role }}
                className="block text-center text-sm font-semibold text-primary hover:underline"
              >
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <PasswordField
                id="password"
                label="New password"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={setPassword}
              />
              <PasswordField
                id="confirmPassword"
                label="Confirm new password"
                autoComplete="new-password"
                minLength={6}
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update password"}
              </Button>
            </form>
          )
        )}

        {/* Login / Signup */}
        {(isLogin || isSignup) && (
          <>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {isSignup && (
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
                          className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${role === option
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-input bg-background text-muted-foreground hover:bg-accent"
                            }`}
                        >
                          {option === "patient" ? "Patient" : "Pharmacy owner"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {role === "pharmacy" && (
                    <div className="space-y-4 rounded-xl border border-border bg-secondary/40 p-4">
                      <p className="text-sm font-semibold text-foreground">Pharmacy details</p>
                      <div className="space-y-2">
                        <Label htmlFor="pharmacyName">Pharmacy name</Label>
                        <Input
                          id="pharmacyName"
                          value={pharmacyName}
                          onChange={(e) => setPharmacyName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={stateName}
                            onChange={(e) => setStateName(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pincode">Pincode</Label>
                        <Input
                          id="pincode"
                          inputMode="numeric"
                          pattern="[0-9]{4,10}"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            aria-label="Latitude"
                            placeholder="Latitude"
                            value={latitude ?? ""}
                            onChange={(e) =>
                              setLatitude(e.target.value === "" ? null : Number(e.target.value))
                            }
                          />
                          <Input
                            aria-label="Longitude"
                            placeholder="Longitude"
                            value={longitude ?? ""}
                            onChange={(e) =>
                              setLongitude(e.target.value === "" ? null : Number(e.target.value))
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={detectLocation}
                          disabled={locating}
                        >
                          <MapPin className="mr-2 size-4" />
                          {locating ? "Getting location..." : "Use my current location"}
                        </Button>
                      </div>
                    </div>
                  )}
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

              <PasswordField
                id="password"
                label="Password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                minLength={6}
                value={password}
                onChange={setPassword}
              />

              {isLogin && (
                <p className="-mt-2 text-right">
                  <Link
                    to="/auth"
                    search={{ mode: "forgot", role }}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </p>
              )}

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
          </>
        )}
      </div>
    </div>
  );
}
