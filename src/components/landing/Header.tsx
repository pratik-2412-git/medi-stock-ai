import { Link } from "@tanstack/react-router";
import { Cross } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <Cross className="size-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            MediStock <span className="text-primary">AI</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Login
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
          >
            Sign Up
          </Link>
        </nav>
      </div>
    </header>
  );
}
