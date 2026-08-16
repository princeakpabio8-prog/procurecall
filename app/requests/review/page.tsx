 "use client";

import { useEffect, useState } from "react";

type CallResult = {
  status?: string | null;
  completed?: string | null;
  summary?: string | null;
  evidence?: string | null;
  failure_message?: string | null;
  structured_result?: unknown;
  [key: string]: unknown;
};

type RequestData = {
  id?: string;
  title?: string;
  product?: string;
  quantity?: number | string;
  delivery?: string;
  budget?: number | string;
  currency?: string;
  supplier?: string;
  phone?: string;
  call_instructions?: string;
  call_result?: CallResult | null;
  callResult?: CallResult | null;
  [key: string]: unknown;
};

function formatStructuredResult(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function ReviewRequestPage() {
  return <ReviewRequestContent />;
}

function ReviewRequestContent() {
  const [request, setRequest] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRequest() {
      try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");

        if (!id) {
          setError("No request ID was provided.");
          return;
        }

        const response = await fetch(`/api/requests/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        setRequest(data?.request ?? data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load request.");
      } finally {
        setLoading(false);
      }
    }

    loadRequest();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-gray-900">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-gray-500">Loading request...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-gray-900">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold text-red-800">
              Unable to load request
            </h1>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!request) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-gray-900">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-gray-500">Request not found.</p>
        </div>
      </main>
    );
  }

  const callResult = request.call_result ?? request.callResult ?? null;
  const structuredResult = callResult?.structured_result;
  const evidence = callResult?.evidence;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                ProcureCall
              </p>
              <h1 className="mt-1 text-2xl font-bold">
                {String(request.title ?? request.product ?? "Procurement Request")}
              </h1>
            </div>

            <a
              href="/requests"
              className="inline-flex h-fit items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Back to requests
            </a>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info label="Product" value={request.product} />
            <Info label="Quantity" value={request.quantity} />
            <Info label="Delivery" value={request.delivery} />
            <Info label="Budget" value={request.budget} />
            <Info label="Currency" value={request.currency} />
            <Info label="Supplier" value={request.supplier ?? request.phone} />
          </div>

          {request.call_instructions && (
            <div className="mt-6 rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Call instructions
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                {request.call_instructions}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                CALL-E RESULT
              </p>
              <h2 className="mt-1 text-xl font-bold">Call outcome</h2>
            </div>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">
              {String(callResult?.status ?? "No result")}
            </span>
          </div>

          {!callResult ? (
            <div className="mt-5 rounded-xl border border-dashed border-gray-300 p-6 text-center">
              <p className="font-medium text-gray-700">
                No call result is available yet.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                The call may still be processing, or the result has not been saved.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {callResult.summary && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Summary
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {callResult.summary}
                  </p>
                </div>
              )}

              {callResult.completed && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Completed
                  </p>
                  <p className="mt-2 text-sm text-gray-700">
                    {callResult.completed}
                  </p>
                </div>
              )}

              {structuredResult != null && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-green-700">
                    Call details
                  </p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                    {formatStructuredResult(structuredResult)}
                  </pre>
                </div>
              )}

              {evidence && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-green-700">
                    Evidence
                  </p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                    {evidence}
                  </pre>
                </div>
              )}

              {callResult.failure_message && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
                    Failure
                  </p>
                  <p className="mt-2 text-sm text-red-700">
                    {callResult.failure_message}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  if (value == null || value === "") return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-gray-800">{String(value)}</p>
    </div>
  );
}