"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RequestRow = {
  id: string;
  product_or_service: string;
  quantity?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRequests() {
      try {
        const response = await fetch("/api/requests");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "Failed to load requests.");
        }

        setRequests(result.requests ?? []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load requests.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadRequests();
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#111111]">
      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between border-b border-black/10 pb-6">
          <div>
            <Link href="/" className="text-xl font-semibold tracking-tight">
              ProcureCall
            </Link>
            <p className="mt-1 text-sm text-black/50">Procurement requests</p>
          </div>
          <Link href="/requests/new" className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white">
            New request
          </Link>
        </header>

        <section className="py-10">
          <h1 className="text-3xl font-semibold tracking-tight">Requests</h1>

          {loading && <p className="mt-6 text-sm text-black/50">Loading...</p>}

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && requests.length === 0 && (
            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-8 text-sm text-black/60">
              No procurement requests yet.
            </div>
          )}

          <div className="mt-6 space-y-3">
            {requests.map((item) => (
              <Link
                key={item.id}
                href={`/requests/review?id=${item.id}`}
                className="block rounded-2xl border border-black/10 bg-white p-5 transition hover:border-black/20"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{item.product_or_service}</p>
                    <p className="mt-1 text-xs text-black/40">
                      {item.quantity || "Quantity not specified"}
                    </p>
                  </div>
                  <span className="rounded-full bg-black/[0.04] px-3 py-1 text-xs text-black/60">
                    {item.status || "unknown"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
