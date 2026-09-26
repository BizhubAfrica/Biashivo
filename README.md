# Biashivo

Biashivo is a mobile-first business management and growth platform built for African SMEs. This repository contains **Phase 0** — a secure, multi-tenant SaaS foundation on which the full product will be built.

> Phase 0 intentionally does **not** include sales, orders, customers, products, expenses, payments, reports, AI, WhatsApp, M-Pesa, or eTIMS. Those belong to later phases. This phase establishes the secure base only.

---

## Technology Stack

- **Frontend:** React + TypeScript, Vite, Tailwind CSS, lucide-react icons
- **Backend / Database / Auth:** Supabase (PostgreSQL + Supabase Auth)
- **Security:** PostgreSQL Row Level Security (RLS) on every table
- **Routing:** react-router-dom

---

## Local Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Copy `.env.example` to `.env` and fill in your Supabase project credentials:
   ```bash
   cp .env.example .env
   ```
   Required variables:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon public key

   > Never put the Supabase **service-role key** in frontend code or `.env`. It must stay server-side only.

3. **Run the dev server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

5. **Type-check**
   ```bash
   npm run typecheck
   ```

---

## Supabase Setup

A Supabase project is provisioned automatically for this project. The database schema is managed through migrations applied via the Supabase MCP tooling.

### Database Migrations

Migrations are reproducible SQL changes applied in order. The Phase 0 migration (`0001_biashivo_phase0_foundation`) creates all four tables, RLS policies, indexes, triggers, and SECURITY DEFINER functions.

To re-apply or inspect migrations, use the Supabase MCP tools (`apply_migration`, `execute_sql`, `get_security_posture`).

---

## Authentication

Biashivo uses Supabase Auth (email + password). The following flows are implemented:

- **Register** — creates an auth account, auto-creates a profile via a database trigger, then guides the user through onboarding to create their first business.
- **Login / Logout**
- **Password reset** (forgot password → email link → reset)
- **Email verification** flow
- **Session persistence** — sessions are restored on reload via `onAuthStateChange`.

Passwords are never stored manually; Supabase Auth manages all credentials.

---

## Database Foundation

Four tables are created in Phase 0:

| Table | Purpose |
|---|---|
| `profiles` | One profile per authenticated user (full name, phone, avatar). Auto-created on signup. |
| `businesses` | A tenant/business entity. Created only via the `onboard_business` SECURITY DEFINER function. |
| `business_members` | Links users to businesses with a role. A user may belong to multiple businesses. |
| `audit_logs` | Immutable, append-only log of important foundation events. |

### Roles

| Role | Description |
|---|---|
| `BUSINESS_OWNER` | Can manage their business, members, and settings. |
| `BUSINESS_STAFF` | Can authenticate and access the shell, but cannot manage members or security-sensitive settings. |
| `SUPER_ADMIN` | Platform-level role. Not assignable from the application in Phase 0. |

### Multi-Tenancy & RLS

- Row Level Security is enabled on every table.
- A user can only access businesses where they have an **active** membership.
- Tenant access is verified via the `user_has_business_access(business_id)` SECURITY DEFINER function.
- Business creation is enforced server-side via `onboard_business` — there is no direct client INSERT policy on `businesses`.
- A trigger (`guard_business_owner`) prevents removing or demoting the sole business owner.
- SUPER_ADMIN can never be assigned through any client-facing function or policy.

### Key Database Functions

- `onboard_business(name, type, currency, country, phone)` — atomically creates a business + owner membership + audit log.
- `user_has_business_access(business_id)` — reusable tenant-access check.
- `current_user_business_role(business_id)` — returns the caller’s role for a business.
- `add_business_member`, `update_business_member_role`, `remove_business_member` — owner-only member management (never SUPER_ADMIN).
- `write_audit_log` — audited settings changes.

---

## Project Architecture

```
src/
  components/        Reusable UI primitives + route guards
    ui/              Button, Input, Select, Alert, Card, Feedback
  layouts/           AppLayout (authenticated shell with nav)
  pages/             Route-level pages
  hooks/             useAuth, useActiveBusiness
  services/          API/data-access layer
    auth/            signUp, signIn, signOut, password reset
    business/        onboard, fetch/update business, members
    users/           profile fetch/update
    audit/           audit log read/write
  lib/
    supabase/        Centralized Supabase client
    validation/      Centralized form validation
    security/        Friendly error mapping
  types/             Shared TypeScript types
```

Database logic lives in services and SECURITY DEFINER functions — never scattered inside UI components.

---

## Routes

| Route | Access |
|---|---|
| `/` | Public |
| `/login` | Public |
| `/register` | Public |
| `/forgot-password` | Public |
| `/reset-password` | Public |
| `/verify-email` | Public |
| `/onboarding` | Authenticated |
| `/dashboard` | Authenticated + business |
| `/settings` | Authenticated + business |

Unauthenticated users visiting protected routes are redirected to `/login`.

---

## Security Testing

The following tests are described and verified against the database security posture:

1. **User isolation** — users cannot read another user’s profile.
2. **Business isolation** — members of Business A cannot access Business B.
3. **Membership isolation** — a user cannot create a membership for another business.
4. **Role escalation** — staff cannot promote themselves to owner.
5. **SUPER_ADMIN escalation** — no client path assigns SUPER_ADMIN.
6. **Direct database access** — RLS blocks unauthorized queries.
7. **Session protection** — unauthenticated users cannot reach `/dashboard`.
8. **Logout** — after logout, protected routes redirect to `/login`.

Use `get_security_posture` and `get_advisors` to inspect the live RLS state and linter findings.

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend `.env` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | frontend `.env` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side only | Privileged operations (never in frontend) |

---

## GitHub & Deployment

The project is structured to be connected to a GitHub repository and deployed to Netlify or an equivalent host. No production domain is connected in Phase 0 — the app runs in the Bolt preview environment until fully tested.

---

## Future Phases

Planned for later phases (not built yet):

- Customers, Products, Orders, Sales, Expenses, Payments
- Profit calculations, Business Health, Profit Leak Detector
- AI Business Brain
- WhatsApp, M-Pesa, eTIMS integrations
- Invoices, Quotes, Subscriptions, Payroll
- Inventory, Supplier management, Multi-branch, Marketplace, E-commerce
- Native mobile apps

The codebase is organized so these can be added as new services and tables without restructuring the foundation.

## Phase 0.1 security hardening

Migration `20260926021500_0005_phase0_1_security_hardening.sql` hardens the Phase 0 foundation by:

- removing direct authenticated `INSERT`/`UPDATE`/`DELETE` access to `business_members`;
- requiring membership changes to use the audited owner-only RPCs;
- requiring the caller role to be exactly `BUSINESS_OWNER`;
- preserving the sole-owner database trigger;
- adding database-side validation for core business onboarding fields; and
- reapplying least-privilege RPC execution grants after function replacement.

The new business-field constraints are added as `NOT VALID`: PostgreSQL enforces them for new or changed rows without making deployment fail because of an unknown pre-existing legacy row. Existing rows should be checked before separately validating the constraints in production.
