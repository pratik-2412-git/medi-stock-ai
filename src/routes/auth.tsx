import { createFileRoute, Link } from "@tanstack/react-router";

const title = "Login or Sign Up — MediStock AI";
const description =
  "Access MediStock AI as a patient or pharmacy owner to track medicine stock and shortage alerts.";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "login" ? ("login" as const) : ("signup" as const),
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
  const { mode } = Route.useSearch();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {mode === "login" ? "Login" : "Sign Up"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Accounts for patients and pharmacy owners arrive in the next stage of MediStock AI.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
