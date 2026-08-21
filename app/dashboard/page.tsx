"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type RequestRow = {
  id: string;
  product_or_service: string;
  quantity?: string | null;
  created_at?: string | null;
};

type RequestDetail = {
  request: RequestRow;
  suppliers?: { id: string }[];
  callResults?: { status?: string | null }[];
};

function statusOf(value: unknown) {
  return String(value ?? "queued").toLowerCase().replaceAll("_", " ");
}

export default function DashboardPage() {
  const [details, setDetails] = useState<RequestDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/requests", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Dashboard could not load.");
      }

      const requests: RequestRow[] = data.requests ?? [];
      const loaded = await Promise.all(
        requests.slice(0, 20).map(async (request) => {
          const detailResponse = await fetch(`/api/requests/${request.id}`, {
            cache: "no-store",
          });
          const detail = await detailResponse.json();
          return {
            request,
            suppliers: detail.suppliers ?? [],
            callResults: detail.callResults ?? [],
          };
        }),
      );

      setDetails(loaded);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Dashboard could not load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [load]);

  const results = details.flatMap((detail) => detail.callResults ?? []);
  const completed = results.filter((result) => ["completed", "complete", "finished", "success", "successful"].includes(statusOf(result.status))).length;
  const active = results.filter((result) => ["queued", "ringing", "in progress", "answered", "active", "processing"].includes(statusOf(result.status))).length;

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#111111]">
      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between border-b border-black/10 pb-6">
          <div>
            <Link href="/" className="text-xl font-semibold tracking-tight">ProcureCall</Link>
            <p className="mt-1 text-sm text-black/50">Procurement dashboard</p>
          </div>
          <Link href="/requests/new" className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white">New request</Link>
        </header>

        <section className="py-10">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-black/40">Operations overview</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Procurement control room</h1>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[["Requests", details.length], ["Calls in progress", active], ["Completed results", completed]].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-black/10 bg-white p-5">
                <p className="text-sm text-black/50">{label}</p>
                <p className="mt-3 text-3xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          {loading && <p className="mt-8 text-sm text-black/50">Loading dashboard...</p>}
          {error && <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          {!loading && !error && details.length === 0 && (
            <div className="mt-8 rounded-2xl border border-black/10 bg-white p-8 text-sm text-black/60">No procurement requests yet.</div>
          )}

          <div className="mt-8 space-y-4">
            {details.map((detail) => {
              const statuses = (detail.callResults ?? []).map((result) => statusOf(result.status));
              return (
                <Link key={detail.request.id} href={`/requests/review?id=${detail.request.id}`} className="block rounded-2xl border border-black/10 bg-white p-5 transition hover:border-black/30">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold">{detail.request.product_or_service}</h2>
                      <p className="mt-1 text-sm text-black/50">{detail.suppliers?.length ?? 0} suppliers · {detail.request.quantity || "Quantity not specified"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {statuses.length === 0 ? <span className="rounded-full bg-black/[0.05] px-3 py-1 text-xs text-black/60">Not started</span> : statuses.map((status, index) => <span key={`${status}-${index}`} className="rounded-full bg-black/[0.05] px-3 py-1 text-xs capitalize text-black/60">{status}</span>)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}