"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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
  callId?: string;
  status?: string;
  taskCompleted?: boolean | null;
  completionConfidence?: { score?: number; label?: string } | null;
  structuredResult?: Record<string, unknown> | null;
  summary?: string | null;
  evidence?: string[];
  failureCode?: string | null;
  failureMessage?: string | null;
};

export default function ReviewRequestPage() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("id");

  const [request, setRequest] = useState<ProcurementRequest | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState("");
  const [callResult, setCallResult] = useState<CallResult | null>(null);

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }

    async function loadRequest() {
      try {
        const response = await fetch(`/api/requests/${requestId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "Failed to load request.");
        }

        setRequest(result.request);
        setSuppliers(result.suppliers ?? []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load request.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadRequest();
  }, [requestId]);

  async function startSupplierCall() {
    if (!requestId) return;

    setCalling(true);
    setError("");
    setCallResult(null);

    try {
      const response = await fetch(`/api/requests/${requestId}/call`, {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Supplier call failed.");
      }

      setCallResult(result);
    } catch (callError) {
      setError(
        callError instanceof Error
          ? callError.message
          : "Supplier call failed.",
      );
    } finally {
      setCalling(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="border-b border-black/10 px-6 py-5">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
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
        {!requestId && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            This page was opened without a procurement request ID.
          </div>
        )}

        {loading && requestId && (
          <div className="rounded-2xl border border-black/10 p-6 text-sm text-black/60">
            Loading request...
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
                <dt className="text-xs uppercase tracking-wider text-black/40">Quantity</dt>
                <dd className="mt-1 text-sm">{request.quantity || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-black/40">Target budget</dt>
                <dd className="mt-1 text-sm">{request.target_budget || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-black/40">Delivery</dt>
                <dd className="mt-1 text-sm">{request.delivery_location || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-black/40">Supplier</dt>
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
                <p className="mt-2 text-sm leading-6">{request.instructions}</p>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
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
              CALL-E result
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-green-700/70">Status</p>
                <p className="mt-1 text-sm font-medium">{callResult.status || "Unknown"}</p>
              </div>
              <div>
                <p className="text-xs text-green-700/70">Completed</p>
                <p className="mt-1 text-sm font-medium">
                  {callResult.taskCompleted === true ? "Yes" : "No / unknown"}
                </p>
              </div>
            </div>

            {callResult.summary && (
              <div className="mt-5">
                <p className="text-xs text-green-700/70">Summary</p>
                <p className="mt-1 text-sm leading-6">{callResult.summary}</p>
              </div>
            )}

            {callResult.structuredResult && (
              <div className="mt-5">
                <p className="text-xs text-green-700/70">Supplier offer</p>
                <pre className="mt-2 overflow-x-auto rounded-xl bg-white/70 p-4 text-xs leading-6">
                  {JSON.stringify(callResult.structuredResult, null, 2)}
                </pre>
              </div>
            )}

            {callResult.failureMessage && (
              <p className="mt-4 text-sm text-red-700">{callResult.failureMessage}</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
