# Accepto MVP Routes (Next.js App Router)

This is the minimal route set for a 2-week MVP.

## 1) Auth
- `/login`
  - Email/password login form.
- `/signup`
  - Email/password registration form.

## 2) App (Authenticated)
- `/dashboard`
  - Default post-login page.
  - Shows quote list with status and totals.
- `/dashboard/quotes/new`
  - Create quote form:
    - client selection/creation
    - quote title/note
    - line items
- `/dashboard/quotes/[quoteId]`
  - Quote detail view for workspace user.
  - Actions by status:
    - `draft`: edit + send
    - `sent`: view public link/status
    - `accepted`: create Stripe Checkout link
    - `paid`: read-only summary

## 3) Public Quote Link
- `/q/[token]`
  - Public page for client.
  - Shows quote details and status.
  - `sent` status: show Accept button.
  - `accepted` status: show Pay button (Stripe Checkout redirect).
  - `paid` status: show paid confirmation.

## 4) Payment Return + Webhook
- `/payment/success`
  - Client redirect target after successful Stripe Checkout.
  - Shows confirmation UI while final status is confirmed via webhook.
- `/payment/cancel`
  - Client redirect if checkout is canceled.
  - Returns user to quote page.
- `/api/stripe/webhook`
  - Receives Stripe webhook events.
  - Handles `checkout.session.completed`.
  - Idempotently updates `payments` and `quotes`.

## 5) Optional Internal API Endpoints (If Needed)
For App Router server actions, API routes may be minimal. If endpoints are preferred:
- `/api/quotes/send`
- `/api/quotes/[quoteId]/accept`
- `/api/quotes/[quoteId]/create-checkout-session`

These should remain internal implementation details and can be replaced with server actions.

## Route Groups Suggestion
- `src/app/(auth)/...`
- `src/app/(app)/dashboard/...`
- `src/app/q/[token]/...`

Only use route groups if they simplify layout sharing; not required for MVP.
