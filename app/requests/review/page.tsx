"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type ProcurementRequest = {
  id: string;
  product_or_service: string;
  quantity?: string | null;
  target_budget?: string | null;
  delivery_location?: string | null;
  instructions?: string | null;
};

type Supplier = {
  id: string;
  phone: string;
  name?: string | null;
};

type CallResult = {
  id?: string;
  call_id?: string | null;
  status?: string | null;
  task_completed?: boolean | null;
  completion_confidence?: unknown;
  structured_result?: unknown;
  summary?: string | null;
  evidence?: unknown;
  failure_code?: string | null;
  failure_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function ReviewRequestContent() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("id");

  const [request, setRequest] = useState<ProcurementRequest | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [callResult, setCallResult] = useState<CallResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadRequest = useCallback(async () => {
    if (!requestId) {
      setLoading(false);
      setError("No request ID was provided.");
      return;
    }

    try {
      setError("");

      const response = await fetch(`/api/requests/${requestId}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load request.");
      }

      setRequest(data.request ?? null);
      setSuppliers(data.suppliers ?? []);
      setCallResult(data.callResult ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load request.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => {
    void loadRequest();
  }, [loadRequest]);

  async function startSupplierCall() {
    if (!requestId) return;

    setCalling(true);
    setError("");

    try {
      const response = await fetch(`/api/requests/${requestId}/call`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Supplier call failed.");
      }

      setCallResult(data);
      await loadRequest();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Supplier call failed.",
      );
    } finally {
      setCalling(false);
    }
  }

  async function refreshCallResult() {
    setRefreshing(true);
    await loadRequest();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-black">
        <div className="mx-auto max-w-4xl rounded-2xl border border-black/10 p-6 text-sm text-black/60">
          Loading request...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="border-b border-black/10 px-6 py-5">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50"
          >
            ProcureCall
          </Link>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Review procurement request
          </h1>

          <p className="mt-2 text-sm text-black/60">
            Confirm the request, then let ProcureCall contact the supplier.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {request && (
          <div className="rounded-2xl border border-black/10 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-black/50">
                  Request
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  {request.product_or_service}
                </h2>
              </div>

              <p className="break-all text-xs text-black/40">{request.id}</p>
            </div>

            <dl className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wider text-black/40">
                  Quantity
                </dt>
                <dd className="mt-1 text-sm">
                  {request.quantity || "Not specified"}
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase tracking-wider text-black/40">
                  Target budget
                </dt>
                <dd className="mt-1 text-sm">
                  {request.target_budget || "Not specified"}
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase tracking-wider text-black/40">
                  Delivery
                </dt>
                <dd className="mt-1 text-sm">
                  {request.delivery_location || "Not specified"}
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase tracking-wider text-black/40">
                  Supplier
                </dt>
                <dd className="mt-1 text-sm">
                  {suppliers[0]?.phone || "No supplier phone attached"}
                </dd>
              </div>
            </dl>

            {request.instructions && (
              <div className="mt-6 rounded-xl bg-black/[0.03] p-5">
                <p className="text-xs uppercase tracking-wider text-black/40">
                  Call instructions
                </p>
                <p className="mt-2 text-sm leading-6">
                  {request.instructions}
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/requests/new"
                className="rounded-full border border-black/15 px-6 py-3 text-center text-sm font-medium hover:bg-black/5"
              >
                Back to request
              </Link>

              <button
                type="button"
                onClick={startSupplierCall}
                disabled={calling || suppliers.length === 0}
                className="rounded-full bg-[#111111] px-6 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {calling ? "Calling supplier..." : "Call supplier with AI"}
              </button>
            </div>
          </div>
        )}

        {callResult && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-green-700">
              CALL-E RESULT
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-green-700/70">Status</p>
                <p className="mt-1 text-sm font-medium">
                  {callResult.status || "Unknown"}
                </p>
              </div>

              <div>
                <p className="text-xs text-green-700/70">Completed</p>
                <p className="mt-1 text-sm font-medium">
                  {callResult.task_completed === true ? "Yes" : "No / unknown"}
                </p>
              </div>
            </div>

            {callResult.summary && (
              <div className="mt-5">
                <p className="text-xs text-green-700/70">Summary</p>
                <p className="mt-1 text-sm leading-6">
                  {callResult.summary}
                </p>
              </div>
            )}

            {Boolean(callResult.structured_result) && (
                <div className="mt-5">
                  <p className="text-xs text-green-700/70">Supplier offer</p>
                  <pre className="mt-2 overflow-x-auto rounded-xl bg-white/70 p-4 text-xs leading-6">
                    {formatValue(callResult.structured_result)}
                  </pre>
                </div>
              )}

            {Boolean(callResult.evidence) && (
                <div className="mt-5">
                  <p className="text-xs text-green-700/70">Evidence</p>
                  <pre className="mt-2 overflow-x-auto rounded-xl bg-white/70 p-4 text-xs leading-6">
                    {formatValue(callResult.evidence)}
                  </pre>
                </div>
              )}

            {callResult.failure_message && (
              <p className="mt-4 text-sm text-red-700">
                {callResult.failure_message}
              </p>
            )}
          </div>
        )}

        {!callResult && request && (
          <div className="mt-6 rounded-2xl border border-black/10 bg-black/[0.02] p-6">
            <p className="text-sm font-medium">
              No completed CALL-E result is available yet.
            </p>

            <p className="mt-2 text-sm leading-6 text-black/60">
              If the supplier call has already finished, refresh this page to
              check for the completed result.
            </p>

            <button
              type="button"
              onClick={refreshCallResult}
              disabled={refreshing}
              className="mt-4 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh call result"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default function ReviewRequestPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white px-6 py-10 text-black">
          <div className="mx-auto max-w-4xl rounded-2xl border border-black/10 p-6 text-sm text-black/60">
            Loading request...
          </div>
        </main>
      }
    >
      <ReviewRequestContent />
    </Suspense>
  );
}