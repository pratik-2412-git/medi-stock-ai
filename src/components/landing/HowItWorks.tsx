import { Brain, ClipboardList, MapPin } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    title: "Pharmacies update stock",
    text: "Pharmacy owners keep their medicine inventory current in a few taps, from any device.",
  },
  {
    icon: Brain,
    title: "AI predicts shortages",
    text: "Demand patterns and stock movement are analysed to flag medicines heading toward a shortage.",
  },
  {
    icon: MapPin,
    title: "Patients find medicines nearby",
    text: "Search a medicine and see which nearby pharmacies have it in stock, right now.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border bg-card/60">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          How It Works
        </h2>

        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="rounded-2xl border border-border bg-background p-6 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <step.icon className="size-5" />
                </span>
                <span className="text-xs font-bold tracking-widest text-muted-foreground">
                  STEP {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm font-medium">
          <StatusChip className="bg-status-ok-soft text-status-ok-foreground" dot="bg-status-ok">
            In stock
          </StatusChip>
          <StatusChip
            className="bg-status-warn-soft text-status-warn-foreground"
            dot="bg-status-warn"
          >
            Low stock
          </StatusChip>
          <StatusChip
            className="bg-status-critical-soft text-status-critical-foreground"
            dot="bg-status-critical"
          >
            Out of stock
          </StatusChip>
        </div>
      </div>
    </section>
  );
}

function StatusChip({
  children,
  className,
  dot,
}: {
  children: React.ReactNode;
  className: string;
  dot: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 ${className}`}>
      <span className={`size-2 rounded-full ${dot}`} />
      {children}
    </span>
  );
}
