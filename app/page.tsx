import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#111111]">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xl font-semibold tracking-tight">ProcureCall</p>
            <p className="mt-1 text-sm text-black/50">AI calls. You choose.</p>
          </div>

          <div className="hidden rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-black/60 sm:block">
            Procurement workspace
          </div>
        </header>

        <div className="flex flex-1 items-center py-20">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-black/45">
              Intelligent procurement
            </p>

            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Let the phone do the work.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-black/60 sm:text-xl">
              ProcureCall contacts suppliers, gathers real offers, compares
              them, and helps you choose the right one.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/requests/new"
                className="rounded-full bg-[#111111] px-6 py-3.5 text-center text-sm font-medium text-white transition hover:bg-black/80"
              >
                Create procurement request
              </Link>

              <Link
                href="/requests"
                className="rounded-full border border-black/10 bg-white px-6 py-3.5 text-center text-sm font-medium text-black transition hover:bg-black/[0.03]"
              >
                View requests
              </Link>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-black/10 pt-5 text-xs text-black/40">
          <span>ProcureCall</span>
          <span>AI calls. You choose.</span>
        </footer>
      </section>
    </main>
  );
}
