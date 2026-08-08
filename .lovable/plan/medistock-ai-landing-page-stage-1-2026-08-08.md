# MediStock AI — Landing Page (Stage 1)

Build the public landing page for MediStock AI: patients find medicines at nearby pharmacies, pharmacy owners get shortage warnings.

## What gets built

Single page at `/` (replacing the template placeholder), fully responsive:

- **Header** — "MediStock AI" wordmark with a pill/cross mark, plus Login and Sign Up buttons.
- **Hero** — headline "Real-Time Medicine Stock and Shortage Prediction", supporting paragraph on patient search + pharmacy shortage alerts.
- **Role selection** — three buttons:
  1. I'm a Patient (active)
  2. I'm a Pharmacy Owner (active)
  3. I'm a Central Medical Store Admin (disabled, with "Coming soon" hint)
- **How It Works** — three numbered steps: Pharmacies update stock → AI predicts shortages → Patients find medicines nearby.
- **Footer** — About, Contact, GitHub, Hackathon Information.

Active role buttons and Login/Sign Up point to placeholder auth routes for now; no authentication, no database, no admin logic in this stage.

## Design

Clean, trustworthy healthcare look: medical green as primary, deep blue as secondary/trust accent, on a soft near-white background. Status token set defined up front for later stock badges: green = in stock, yellow = low stock, red = out of stock. Generous whitespace, soft rounded cards, subtle shadows, no gradients-on-white AI clichés.

## Technical notes

- This project runs on TanStack Start (React 19 + Vite + Tailwind v4) with TanStack Router for routing, so the requested React Router / Express pieces are covered by the equivalent built-in routing and server functions. Backend, when we add it in a later stage, uses Lovable Cloud (Postgres, auth, storage) rather than a separate Express server.
- Colors and status tokens go into `src/styles.css` as semantic tokens (oklch); components use tokens only.
- Page composed from small components under `src/components/landing/`, assembled in `src/routes/index.tsx`.
- Route-level SEO metadata via `head()`: unique title, description, og/twitter tags. Single H1, semantic sections, alt text.

## Next stages (not in this plan)

Auth + role-based dashboards, pharmacy stock management, medicine search with nearby pharmacies, shortage prediction.
