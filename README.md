This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# ProcureCall

ProcureCall is an autonomous procurement calling workspace. It contacts
suppliers by phone, captures real commercial terms, turns the conversation
into structured evidence, compares multiple offers, and recommends the
strongest match for a procurement request.

## The Problem

Supplier outreach is often slow, inconsistent, and difficult to compare. A
buyer may need to call several suppliers, repeat the same questions, record
prices and terms manually, and decide from incomplete notes. ProcureCall
standardizes that workflow in one place.

## How It Works

1. A buyer creates one procurement request with the product, quantity, budget,
   delivery location, and call instructions.
2. The buyer adds one or more supplier phone numbers.
3. ProcureCall sends the same procurement brief to CALL-E for each supplier.
4. Each call runs asynchronously so the web request does not wait for the
   phone conversation to finish.
5. CALL-E sends the finalized summary, structured offer, and evidence to the
   ProcureCall webhook.
6. The dashboard and review page poll for updates and display queued,
   in-progress, completed, and failed calls.

## Multi-Supplier Comparison

One procurement request can contain several suppliers. Each supplier call is
stored independently using its supplier and call identifiers, so one result
does not overwrite another. The review page presents comparable supplier offer
cards with:

- Price and currency
- Availability
- Delivery time
- Minimum order
- Payment terms
- Additional fees
- Fulfillment status
- Supplier notes and evidence

The recommendation logic prioritizes confirmed fulfillment, then considers
price availability, availability details, delivery details, and completeness
of the commercial terms. It identifies the strongest available match while
keeping every supplier offer visible for buyer review. It is decision support,
not an automatic purchase authorization.

## Evidence-Based Results

ProcureCall preserves the provider summary, structured result, completion
status, confidence, and evidence returned from the call. Evidence is shown as
readable statements in the interface instead of leaving the buyer with raw
provider JSON. Pending calls are recorded immediately, and result polling can
reconcile a pending call with CALL-E if webhook delivery is delayed.

## Architecture

```text
Browser
	-> Next.js request and review pages
	-> Next.js API routes
	-> CALL-E outbound phone calls
	-> CALL-E webhook
	-> Supabase procurement_requests, suppliers, and call_results
	-> Polling dashboard and comparison UI
```

The application runs as a Next.js App Router application. Cloudflare Workers
runs the OpenNext-generated Worker and serves the generated static assets.
Supabase stores procurement requests, suppliers, and call results. CALL-E
handles phone outreach and post-call result generation.

## Technology Stack

- Next.js 16 App Router
- React 19 and TypeScript
- CALL-E SDK and Calls API
- Supabase SSR and Supabase JS
- OpenNext Cloudflare adapter
- Cloudflare Workers and Wrangler
- Tailwind CSS

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file named `.env.local` with these variable names:

```text
CALLE_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Do not commit `.env.local` or any secret values. Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Cloudflare Deployment

The production branch is:

```text
production-hardening
```

Cloudflare Workers Builds configuration:

```text
Root directory:
/

Build command:
npm run build:cloudflare

Production deploy command:
npm run deploy:cloudflare
```

The production deploy script runs:

```bash
npm run build:cloudflare && npx wrangler deploy
```

The OpenNext build generates `.open-next/worker.js` and `.open-next/assets`
before Wrangler deploys the Worker. Preview or non-production branch uploads
use:

```bash
npm run version:cloudflare
```

Configure the required secrets in Cloudflare Worker environment settings.
Never place secret values in this repository.

## Validation

Run the application build:

```bash
npm run build
```

Run the Cloudflare build and generate the Worker bundle:

```bash
npm run build:cloudflare
```

Validate the generated package without publishing:

```bash
npx wrangler deploy --dry-run
npx wrangler versions upload --dry-run
```

The repository intentionally ignores generated `.next`, `.open-next`, and
local environment files.
