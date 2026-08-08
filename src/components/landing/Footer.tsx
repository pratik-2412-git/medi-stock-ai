const links = [
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
  { label: "GitHub", href: "https://github.com" },
  { label: "Hackathon Information", href: "#hackathon" },
];

export function Footer() {
  return (
    <footer className="bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-10 sm:flex-row sm:justify-between">
        <p className="text-sm font-semibold text-foreground">
          MediStock <span className="text-primary">AI</span>
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
