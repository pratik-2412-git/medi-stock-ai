import { Link } from "@tanstack/react-router";
import { Building2, Lock, User } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,var(--color-primary-soft),transparent)]"
      />
      <div className="relative mx-auto max-w-4xl px-5 pt-16 pb-14 text-center sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
          <span className="size-2 rounded-full bg-status-ok" />
          Live pharmacy stock across your city
        </span>

        <h1 className="mt-6 text-4xl leading-[1.1] font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Real-Time Medicine Stock and Shortage Prediction
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Patients can instantly check which nearby pharmacies have the medicine they need, and
          pharmacies receive early shortage warnings so they can restock before supplies run out.
        </p>

        <div className="mt-10">
          <p className="text-sm font-semibold text-muted-foreground">Continue as</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <RoleButton
              to="/auth"
              icon={<User className="size-5" />}
              label="I'm a Patient"
              hint="Find medicines nearby"
            />
            <RoleButton
              to="/auth"
              icon={<Building2 className="size-5" />}
              label="I'm a Pharmacy Owner"
              hint="Update stock, get alerts"
            />
            <div
              aria-disabled="true"
              className="flex cursor-not-allowed flex-col items-center gap-1 rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-5 text-center opacity-70"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <Lock className="size-5" />
              </span>
              <span className="mt-1 text-sm font-semibold text-muted-foreground">
                I'm a Central Medical Store Admin
              </span>
              <span className="text-xs text-muted-foreground">Coming soon</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoleButton({
  to,
  icon,
  label,
  hint,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Link
      to={to}
      search={{ mode: "signup" }}
      className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-4 py-5 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lift"
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
        {icon}
      </span>
      <span className="mt-1 text-sm font-semibold text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </Link>
  );
}
