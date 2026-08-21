This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy to Cloudflare Workers

Build the OpenNext Worker bundle and deploy it with Wrangler:

```bash
npm run build:cloudflare
npm run deploy:cloudflare
```

The deploy command regenerates `.open-next/worker.js` and
`.open-next/assets` immediately before running `wrangler deploy`. For a
Cloudflare dashboard build/deploy pipeline, use:

- Build command: `npm run build:cloudflare`
- Production deploy command: `npm run deploy:cloudflare`
- Non-production branch deploy command: `npm run version:cloudflare`

Both deploy scripts generate `.open-next/worker.js` and `.open-next/assets`
immediately before Wrangler runs, so the deploy phase cannot start without the
Worker entrypoint.

Configure `CALLE_API_KEY`, Supabase environment variables, and other secrets
in the Cloudflare Worker settings before testing calls.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
