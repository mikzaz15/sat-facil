# Accepto MVP PRD (Quote -> Accept -> Pay)

## 1. Product Summary
Accepto helps service businesses send a quote, collect client acceptance, and receive payment online in one flow.

This document defines an MVP that is realistic to build in 2 weeks using:
- Next.js App Router
- Supabase (Auth + Postgres)
- Stripe (payments)
- Resend (email delivery)

## 2. MVP Goals
- Let a logged-in user create and send a quote to a client.
- Let the client view the quote from a secure public link.
- Let the client accept the quote.
- Let the client pay the accepted quote through Stripe Checkout.
- Keep quote and payment status synced in the app.

## 3. Target User
- Small business owner or freelancer who sends simple quotes and wants fast online acceptance + payment.

## 4. Core User Stories
1. As a business user, I can sign up/log in and access my workspace dashboard.
2. As a business user, I can create a client and draft a quote with line items.
3. As a business user, I can send the quote by email.
4. As a client, I can open a public quote link and review quote details.
5. As a client, I can accept the quote from that page.
6. As a client, I can pay the accepted quote through Stripe.
7. As a business user, I can see quote/payment status updates in the dashboard.

## 5. MVP Scope
### In Scope
- Email/password auth.
- One workspace per account.
- Client CRUD limited to create + list + view basic details.
- Quote creation with:
  - title
  - optional note
  - currency (single currency for MVP, default USD)
  - one or more line items (description, quantity, unit price)
- Quote total calculation (subtotal + total; no taxes/discounts in MVP).
- Quote statuses: `draft`, `sent`, `accepted`, `paid`.
- Public quote page via secure tokenized link.
- Accept action on public page.
- Payment via Stripe Checkout.
- Stripe webhook handling to mark quote/payment as paid.
- Transactional emails via Resend:
  - quote sent email to client
  - payment confirmation email to workspace user (optional in week 2 if time allows)

### Out of Scope (Explicit Non-Goals)
- Teams/multi-user workspaces.
- Recurring invoices/subscriptions.
- Partial payments/deposits/installments.
- Taxes, discounts, coupon logic.
- PDF generation.
- Quote templates.
- Advanced client management, notes, tags.
- Analytics/reporting.
- Multi-currency conversion.

## 6. Functional Requirements
### Auth & Access
- User can sign up, log in, log out.
- Protected dashboard routes require authenticated session.
- Workspace data is isolated per workspace.

### Quote Lifecycle
- Draft quote can be edited until sent.
- Sending quote generates public token link and stores `sent_at`.
- Client can accept once; sets `accepted_at`, status `accepted`.
- Client can pay only after acceptance.
- Successful payment sets quote status `paid` and stores `paid_at`.

### Public Quote Experience
- Public page shows:
  - business/workspace name
  - quote title, note, line items, total
  - current status
  - accept button (if `sent`)
  - pay button (if `accepted` and unpaid)
- Invalid/expired token shows safe error state.

### Payments
- Stripe Checkout Session created from accepted quote total.
- Metadata includes quote id + workspace id.
- Webhook (`checkout.session.completed`) creates/updates payment record and marks quote paid.
- Idempotent webhook processing required.

### Email
- On send quote: email includes quote title, amount, and public link.
- Use Resend API with simple text/HTML template.

## 7. Success Criteria (MVP)
- User can complete full flow in production-like env:
  1. Create quote
  2. Send quote email
  3. Client opens link, accepts, pays
  4. Dashboard reflects `paid` status
- No cross-workspace data leakage.
- Stripe webhook updates are reliable and idempotent.

## 8. Delivery Plan (2 Weeks)
### Week 1
- Project setup and env configuration.
- Supabase auth + protected app shell.
- Database schema + migrations.
- Dashboard quote list + quote create flow.
- Public quote page read-only + accept action.

### Week 2
- Stripe Checkout integration + webhook handling.
- Resend quote-sent email.
- Status sync + dashboard polish.
- QA, bug fixes, and deployment checklist.

## 9. Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only operations where needed)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL`
