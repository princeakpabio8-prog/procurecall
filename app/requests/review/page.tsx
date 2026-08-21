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
  supplier_id?: string | null;
};

type SupplierOffer = Record<string, unknown>;

function offerValue(offer: SupplierOffer, key: string) {
  const value = offer[key];

  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }

  return String(value);
}

function formatPrice(price: string, currency: string) {
  const currencyName = currency.trim().toLowerCase();
  const symbol = currencyName === "naira" || currencyName === "ngn" ? "₦" : "";
  const normalizedPrice = price.trim().replace(/\s+/g, " ");
  const match = normalizedPrice.match(
    /^(?:₦|ngn|naira)?\s*([\d,]+(?:\.\d+)?)\s*(?:₦|ngn|naira)?\s+(?:per|\/)\s+(.+)$/i,
  );

  if (match) {
    return `${symbol}${match[1]} / ${match[2]}`;
  }

  return `${symbol}${normalizedPrice}`;
}

function displayOfferValue(key: string, offer: SupplierOffer) {
  const value = offerValue(offer, key);

  if (key === "price") {
    return formatPrice(value, offerValue(offer, "currency"));
  }

  if (key === "supplier_can_fulfill") {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toSupplierOffer(value: unknown): SupplierOffer {
  return value && typeof value === "object"
    ? (value as SupplierOffer)
    : {};
}

function knownValue(offer: SupplierOffer, key: string) {
  const value = String(offer[key] ?? "").trim().toLowerCase();
  return value && value !== "unknown" && value !== "not provided";
}

function priceNumber(value: unknown) {
  const match = String(value ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function recommendationFor(results: CallResult[]) {
  const candidates = results
    .map((result) => {
      const offer = toSupplierOffer(result.structured_result);
      const fulfillment = String(offer.supplier_can_fulfill ?? "").toLowerCase();
      const price = priceNumber(offer.price);
      const knownFields = [
        "price",
        "availability",
        "delivery_time",
        "minimum_order",
        "payment_terms",
        "additional_fees",
      ].filter((key) => knownValue(offer, key)).length;

      return {
        result,
        fulfillment,
        price,
        knownFields,
        score:
          (fulfillment === "yes" ? 40 : fulfillment === "unknown" ? 15 : 0) +
          (price === null ? 0 : 25) +
          (knownValue(offer, "availability") ? 10 : 0) +
          (knownValue(offer, "delivery_time") ? 10 : 0) +
          Math.round((knownFields / 6) * 15),
      };
    })
    .sort((left, right) => right.score - left.score);

  return candidates[0] ?? null;
}

function evidenceItems(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, item]) => `${key}: ${String(item)}`);
  }

  return [];
}

function errorMessage(value: unknown, fallback: string) {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function ReviewRequestContent() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("id");

  const [request, setRequest] = useState<ProcurementRequest | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [callResults, setCallResults] = useState<CallResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const recommendation = recommendationFor(callResults);

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
        throw new Error(errorMessage(data.error, "Failed to load request."));
      }

      setRequest(data.request ?? null);
      setSuppliers(data.suppliers ?? []);
      setCallResults(
        data.callResults ?? (data.callResult ? [data.callResult] : []),
      );
    } catch (err) {
      setError(errorMessage(err, "Failed to load request."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadRequest();
    }, 0);

    const timer = window.setInterval(() => {
      void loadRequest();
    }, 5000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [loadRequest]);

  async function startSupplierCall() {
    if (!requestId || suppliers.length === 0) return;

    setCalling(true);
    setError("");

    try {
      const response = await fetch(`/api/requests/${requestId}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(errorMessage(data.error, "Supplier calls failed."));
      }

      await loadRequest();
    } catch (err) {
      setError(errorMessage(err, "Supplier call failed."));
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
                  {suppliers.length === 0
                    ? "No supplier phone attached"
                    : `${suppliers.length} supplier${suppliers.length === 1 ? "" : "s"}`}
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
                {calling
                  ? suppliers.length > 1
                    ? "Calling suppliers..."
                    : "Calling supplier..."
                  : suppliers.length > 1
                    ? "Compare supplier offers"
                    : "Call supplier with AI"}
              </button>
            </div>
          </div>
        )}

        {callResults.length > 0 && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-green-700">
              SUPPLIER COMPARISON
            </p>

            {recommendation && (
              <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                  RECOMMENDED SUPPLIER
                </p>
                <p className="mt-2 text-lg font-semibold text-black">
                  {suppliers.find(
                    (supplier) => supplier.id === recommendation.result.supplier_id,
                  )?.name ||
                    suppliers.find(
                      (supplier) => supplier.id === recommendation.result.supplier_id,
                    )?.phone ||
                    "Supplier"}
                </p>
                <p className="mt-2 text-sm leading-6 text-black/65">
                  {recommendation.fulfillment === "yes"
                    ? "Can fulfill the request"
                    : "No supplier confirmed fulfillment; this is the strongest available option"}
                  {recommendation.price !== null
                    ? " with the strongest overall match across price, availability, delivery, and offer completeness."
                    : ". Price comparison was not available, so the recommendation uses fulfillment and requirement coverage."}
                </p>
              </div>
            )}

            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              {callResults.map((callResult) => (
                <article
                  key={callResult.id || callResult.call_id}
                  className="rounded-xl border border-green-200 bg-white/70 p-5"
                >
                  {recommendation?.result.id === callResult.id && (
                    <span className="mb-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                      Recommended
                    </span>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wider text-green-700/70">
                    {suppliers.find((supplier) => supplier.id === callResult.supplier_id)?.name ||
                      suppliers.find((supplier) => supplier.id === callResult.supplier_id)?.phone ||
                      "Supplier"}
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
                      <p className="mt-1 text-sm leading-6">{callResult.summary}</p>
                    </div>
                  )}

                  {Boolean(callResult.structured_result) && (
                    <div className="mt-6 rounded-xl border border-green-200 bg-white/75 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">
                        Supplier offer
                      </p>

                      <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                        {[
                          ["price", "Price"],
                          ["availability", "Availability"],
                          ["delivery_time", "Delivery"],
                          ["minimum_order", "Minimum order"],
                          ["payment_terms", "Payment terms"],
                          ["additional_fees", "Additional fees"],
                          ["supplier_can_fulfill", "Can fulfill request"],
                        ].map(([key, label]) => (
                          <div key={key}>
                            <dt className="text-xs uppercase tracking-wider text-black/40">
                              {label}
                            </dt>
                            <dd className="mt-1 text-sm font-medium text-black">
                              {displayOfferValue(
                                key,
                                toSupplierOffer(callResult.structured_result),
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  {Boolean(callResult.evidence) && (
                    <div className="mt-5">
                      <p className="text-xs text-green-700/70">Evidence</p>
                      <ul className="mt-2 space-y-2 rounded-xl bg-white/70 p-4 text-sm leading-6">
                        {evidenceItems(callResult.evidence).map((item, index) => (
                          <li key={`${item}-${index}`} className="flex gap-2">
                            <span className="text-green-700">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {knownValue(
                    toSupplierOffer(callResult.structured_result),
                    "notes",
                  ) && (
                    <div className="mt-5">
                      <p className="text-xs text-green-700/70">Supplier notes</p>
                      <p className="mt-2 rounded-xl bg-white/70 p-4 text-sm leading-6">
                        {offerValue(
                          toSupplierOffer(callResult.structured_result),
                          "notes",
                        )}
                      </p>
                    </div>
                  )}

                  {callResult.failure_message && (
                    <p className="mt-4 text-sm text-red-700">
                      {callResult.failure_message}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}

        {callResults.length === 0 && request && (
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