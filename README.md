# Morena Collection

E-commerce storefront and admin panel for **Morena Collection** — a multi-line goods house
based in Iwo, Osun State, Nigeria. Perfume is the flagship line; bags, shoes and clothing
run alongside it.

Built by **Damco Space Inc**.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, Server Components) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4, custom design tokens, zero UI libraries |
| Database | PostgreSQL via Drizzle ORM |
| Images | Stored in Postgres and streamed through a route handler |
| Motion | Hand-written CSS / rAF. No animation or 3D libraries. |

No component library, no icon pack, no font download — the entire UI is system fonts,
CSS and a handful of hand-drawn SVGs. That is why it loads fast.

## Features

### Storefront
- Clean, minimal layout in the register of Apple / Shopify — whitespace, hairline rules,
  one accent colour.
- Product cards and hero respond to the pointer in 3D (`src/components/tilt.tsx`).
  rAF-batched, two CSS custom properties, disabled on touch and for reduced motion.
- Cart with `localStorage` persistence, stock-aware quantity caps, slide-over drawer.
- Checkout with delivery or studio pickup, four payment paths, and server-side
  re-pricing (client prices are never trusted).
- Order receipts and a public reference lookup at `/track`.

### Location-based pricing
Every product stores a single base price in USD. `src/lib/currency.ts` converts it into
the buyer's currency with per-market rounding:

- Nigeria → **₦** (rounded to 100)
- United States → **$**, Euro area → **€**, UK → **£**, Canada → **CA$**, Australia → **A$**
- Ghana → **GH₵**, Kenya → **KSh**, South Africa → **R**, UAE → **AED**, India → **₹**
- West Africa → **CFA**, Central Africa → **FCFA**

The visitor's market is resolved in `src/middleware.ts` **before HTML is rendered**, from
the edge country header or a one-off IP lookup, and cached in a cookie for a year. There is
no client-side detection and no post-mount re-render — which is what caused a flash in an
earlier build. A currency switcher in the nav overrides it manually.

Delivery is zoned from the same country code (Iwo pickup, nationwide, West Africa, rest of
Africa, Europe, North America, world) with free delivery above the threshold.

### Admin (`/admin`)
Password-gated (`ADMIN_PASSWORD`, set by you as a Worker secret).

- **Dashboard** — total sales in ₦ and $, order count, unpaid value, live/draft/low-stock
  counts, best sellers, recent orders.
- **Products** — drag-and-drop image upload (resized to 1400px in the browser, stored in
  Postgres, served from `/api/images/[id]`). Saving a product makes it live on the
  storefront immediately. Live/draft toggle, featured flag, sort order, stock, category,
  price entry in any currency with a live four-currency preview, and a URL handle.
- **Orders** — full history with expandable rows, status transitions, and one-tap
  WhatsApp / call actions per customer.

## Getting started

```bash
npm install
cp .env.example .env       # set DATABASE_URL and ADMIN_PASSWORD
npx drizzle-kit push       # create the tables
npm run dev
```

## Pushing to GitHub

The repository is already initialised and committed on `main`, with `.env` and
`node_modules` ignored. Create an **empty** repository on github.com (no README,
no `.gitignore`, no licence — otherwise the histories will not reconcile), then:

```bash
git remote add origin https://github.com/Nakeebv/House_of_morena.git
git push -u origin main
```

GitHub will ask you to sign in — use a **personal access token** as the
password, not your account password. Create one at
*Settings → Developer settings → Personal access tokens → Tokens (classic)*
with the `repo` scope.

Or with the helper script, which also commits anything outstanding first:

```bash
./scripts/push-to-github.sh https://github.com/Nakeebv/House_of_morena.git
```

## Deploying to Cloudflare

One command runs the whole process — authentication, database, secrets, build
and deploy. This is already wired up and the build is verified working:

```bash
./scripts/deploy-cloudflare.sh
```

**What you need first** — a Cloudflare API token, because a headless terminal
cannot open a browser login:

1. Go to *dash.cloudflare.com → My Profile → API Tokens → Create Token*
2. Use the **"Edit Cloudflare Workers"** template
3. Copy the token, then in this terminal:

```bash
export CLOUDFLARE_API_TOKEN="your-token"
```

You will also need a Postgres database. [Neon](https://neon.tech) or
[Supabase](https://supabase.com) both have a free tier and work well — create
one and copy its connection string.

The script then:

1. **Verifies authentication** and stops with clear instructions if absent.
2. **Prepares the build** — runs `scripts/prepare-cloudflare.sh`, which patches
   the `pg-cloudflare` exports map (see below).
3. **Creates the tables** with `drizzle-kit push` against your database.
4. **Uploads secrets** — database URL, admin password, your alert email, the
   email API key, and a randomly generated session secret.
5. **Builds and deploys** with `opennextjs-cloudflare build` and `wrangler deploy`.

Supply settings as environment variables to run it without any prompts:

```bash
export CLOUDFLARE_API_TOKEN="..."
export DATABASE_URL="postgres://..."
export ADMIN_PASSWORD="your-admin-password"
export SELLER_EMAIL="you@example.com"

./scripts/deploy-cloudflare.sh
```

Afterwards your site is at
`https://house-of-morena.<your-subdomain>.workers.dev` and the admin panel at
`/admin`. To redeploy, just run the script again, or:

```bash
npx opennextjs-cloudflare build && npx wrangler deploy
```

To use your own domain, add it in the Cloudflare dashboard under
*Workers & Pages → house-of-morena → Custom domains*, or run `npx wrangler domains`.

**About Cloudflare and the database:** Workers do not open raw TCP sockets the
way a normal Node server does. The [`pg-cloudflare`](https://www.npmjs.com/package/pg-cloudflare)
package is Cloudflare's own socket adapter for `node-postgres` and is installed
here, so the database connects over Workers' native TCP API with no code
changes. Hyperdrive, Cloudflare's connection pooler, is worth adding later for
production traffic but is not required to go live.

**A note on the build patch:** `pg-cloudflare` publishes an `exports` map whose
`default` condition points at an empty stub file. The dependency tracer
therefore copies only the stub, while esbuild — bundling under `workerd`
conditions — needs the real entry point, and the build fails with
`Could not resolve "pg-cloudflare"`. `scripts/prepare-cloudflare.sh` rewrites
that one line to point at the real file. It is idempotent and runs before every
Cloudflare build; without it the build does not complete. If you ever reinstall
dependencies, run it once before deploying.

## Email notifications

Emails are sent automatically when:

- a buyer places an order (confirmation to the buyer, alert to you),
- a payment is marked paid (receipt to the buyer),
- you send a dispatch note from the orders page (courier and tracking),
- you write to a buyer from the Buyers page.

Delivery runs through [Resend](https://resend.com). Set these:

| Variable | What it does |
| --- | --- |
| `RESEND_API_KEY` | Enables delivery. Free tier covers 100 emails a day. |
| `EMAIL_FROM` | e.g. `Morena Collection <orders@yourdomain.com>` |
| `SELLER_EMAIL` | Where new-order alerts are sent. |

Until `RESEND_API_KEY` is set, every message is still composed and saved to the
`messages` table with status `queued`, and the admin dashboard shows exactly
what would have gone out — so nothing is lost and you can see it working before
you connect a provider.

## Payments

Bank transfer, WhatsApp confirmation and pay-on-delivery are live. **Card
payment is on hold** — it is hidden from the checkout and refused by the API
until a live processor is connected. When you are ready, Paystack or
Flutterwave is the right choice for this store: both handle naira, dollars and
mobile money, and both have straightforward checkout redirects.

The catalogue seeds itself with 20 products on first request. Deleting every row makes it
seed again.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `ADMIN_PASSWORD` | yes (prod) | Admin password. Set it as a Worker secret — never commit it. |
| `ADMIN_SESSION_SECRET` | no | HMAC secret for the admin session cookie. |

## Contact

- **WhatsApp** +234 912 130 3157
- **Call** +234 916 211 0077
- **Studio** Iwo, Osun State, Nigeria · Mon–Sat, 9:00–19:00 WAT

---

© Morena Collection. Website by [Damco Space Inc](https://damcospace.com).
