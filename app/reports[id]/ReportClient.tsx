"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ProcurementRequest = {
  id: string;
  product_or_service?: string | null;
  quantity?: string | number | null;
  target_budget?: string | number | null;
  delivery_location?: string | null;
  instructions?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Supplier = {
  id: string;
  phone?: string | null;
  name?: string | null;
  region?: string | null;
};

type StructuredResult = {
  supplier_can_fulfill?: "yes" | "no" | "unknown" | string;
  price?: string | null;
  currency?: string | null;
  availability?: string | null;
  minimum_order?: string | null;
  delivery_time?: string | null;
  payment_terms?: string | null;
  additional_fees?: string | null;
  notes?: string | null;
};

type CallResult = {
  id?: string;
  call_id?: string | null;
  supplier_id?: string | null;
  procurement_request_id?: string | null;
  status?: string | null;
  task_completed?: boolean | null;
  completion_confidence?: number | null;
  summary?: string | null;
  structured_result?: StructuredResult | null;
  evidence?: unknown;
  transcript?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ReportResponse = {
  request?: ProcurementRequest | null;
  suppliers?: Supplier[];
  callResult?: CallResult | null;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function normalizeStatus(call?: CallResult | null) {
  const raw = String(call?.status || "").toLowerCase();

  if (
    call?.task_completed === true ||
    ["completed", "complete", "finished", "ended", "successful", "success"].includes(raw)
  ) {
    return "COMPLETED";
  }

  if (
    ["in_progress", "in-progress", "ringing", "answered", "active", "processing"].includes(raw)
  ) {
    return "IN PROGRESS";
  }

  if (
    ["failed", "failure", "error", "cancelled", "canceled", "no_answer", "no-answer"].includes(raw)
  ) {
    return "FAILED";
  }

  return "WAITING";
}

function StatusPill({ status }: { status: string }) {
  const className =
    status === "COMPLETED"
      ? "pill completed"
      : status === "IN PROGRESS"
        ? "pill progress"
        : status === "FAILED"
          ? "pill failed"
          : "pill waiting";

  return <span className={className}>{status}</span>;
}

function ResultItem({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="resultItem">
      <span>{label}</span>
      <strong>{formatValue(value)}</strong>
    </div>
  );
}

export default function ReportClient({ id }: { id: string }) {
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    if (!id) {
      setError("No request ID was provided.");
      setLoading(false);
      return;
    }

    try {
      setError("");

      const response = await fetch(`/api/requests/${id}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json?.error ||
            json?.message ||
            `Unable to load request. HTTP ${response.status}`
        );
      }

      setData(json);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load procurement report."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    void loadReport();

    const timer = window.setInterval(() => {
      void loadReport();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [loadReport]);

  const request = data?.request ?? null;
  const suppliers = data?.suppliers ?? [];
  const callResult = data?.callResult ?? null;

  const supplier = useMemo(() => {
    if (!callResult?.supplier_id) {
      return suppliers[0] ?? null;
    }

    return (
      suppliers.find((item) => item.id === callResult.supplier_id) ??
      suppliers[0] ??
      null
    );
  }, [callResult?.supplier_id, suppliers]);

  const status = normalizeStatus(callResult);

  const structured =
    callResult?.structured_result &&
    typeof callResult.structured_result === "object"
      ? callResult.structured_result
      : {};

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReport();
  };

  if (loading) {
    return (
      <main className="page">
        <div className="shell">
          <div className="brand">PROCURECALL</div>

          <section className="card loadingCard">
            <div className="spinner" />
            <h1>Loading procurement report</h1>
            <p>
              ProcureCall is retrieving the latest supplier call information.
            </p>
          </section>
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="page">
        <div className="shell">
          <div className="brand">PROCURECALL</div>

          <section className="card errorCard">
            <p className="eyebrow">REPORT ERROR</p>
            <h1>Unable to load report</h1>
            <p>{error}</p>

            <button onClick={handleRefresh}>Try again</button>

            <Link href="/requests" className="secondaryButton">
              Back to requests
            </Link>
          </section>
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="shell">
        <header className="header">
          <div className="brand">PROCURECALL</div>

          <Link href="/requests" className="back">
            ← Requests
          </Link>
        </header>

        <section className="hero">
          <div>
            <p className="eyebrow">SUPPLIER CALL REPORT</p>

            <h1>{request?.product_or_service || "Procurement request"}</h1>

            <p className="subtitle">
              Live procurement result for request{" "}
              <span className="mono">{id}</span>
            </p>
          </div>

          <div className="heroActions">
            <StatusPill status={status} />

            <button
              className="refreshButton"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {error && (
          <div className="notice warning">
            <strong>Refresh issue</strong>
            <span>{error}</span>
          </div>
        )}

        <section className="card">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">REQUEST</p>
              <h2>Procurement details</h2>
            </div>

            <span className="requestStatus">{request?.status || "unknown"}</span>
          </div>

          <div className="requestGrid">
            <ResultItem label="Product / service" value={request?.product_or_service} />
            <ResultItem label="Quantity" value={request?.quantity} />
            <ResultItem label="Target budget" value={request?.target_budget} />
            <ResultItem label="Delivery location" value={request?.delivery_location} />
          </div>

          {request?.instructions && (
            <div className="instructions">
              <span>Buyer instructions</span>
              <p>{request.instructions}</p>
            </div>
          )}
        </section>

        <section className="card">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">SUPPLIER</p>
              <h2>{supplier?.name || supplier?.phone || "Supplier information"}</h2>
            </div>
          </div>

          <div className="requestGrid">
            <ResultItem label="Phone" value={supplier?.phone} />
            <ResultItem label="Supplier ID" value={supplier?.id} />
            <ResultItem label="Region" value={supplier?.region} />
          </div>
        </section>

        <section className="card">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">CALL RESULT</p>
              <h2>Supplier response</h2>
            </div>

            <StatusPill status={status} />
          </div>

          {!callResult && (
            <div className="waitingBox">
              <div className="spinner small" />
              <div>
                <strong>Waiting for supplier call result</strong>
                <p>
                  The call may still be queued or processing. This report
                  automatically checks for the result every 5 seconds.
                </p>
              </div>
            </div>
          )}

          {callResult && status === "WAITING" && (
            <div className="waitingBox">
              <div className="spinner small" />
              <div>
                <strong>Supplier call is queued</strong>
                <p>
                  CALL-E has started the process. ProcureCall will update this
                  report automatically when the supplier response arrives.
                </p>
              </div>
            </div>
          )}

          {callResult && status === "IN PROGRESS" && (
            <div className="waitingBox">
              <div className="spinner small" />
              <div>
                <strong>Supplier call is in progress</strong>
                <p>
                  CALL-E is currently handling the supplier conversation.
                  You do not need to start another call.
                </p>
              </div>
            </div>
          )}

          {callResult && status === "FAILED" && (
            <div className="notice error">
              <strong>Supplier call failed</strong>
              <span>
                {callResult?.failure_message ||
                  callResult?.failure_code ||
                  "The supplier call did not complete successfully."}
              </span>
            </div>
          )}

          {callResult && status === "COMPLETED" && (
            <>
              <div className="fulfillment">
                <div>
                  <span>Can supplier fulfill?</span>
                  <strong
                    className={
                      structured.supplier_can_fulfill === "yes"
                        ? "yes"
                        : structured.supplier_can_fulfill === "no"
                          ? "no"
                          : ""
                    }
                  >
                    {formatValue(structured.supplier_can_fulfill)}
                  </strong>
                </div>

                <div>
                  <span>Confidence</span>
                  <strong>
                    {typeof callResult?.completion_confidence === "number"
                      ? `${Math.round(callResult.completion_confidence * 100)}%`
                      : "—"}
                  </strong>
                </div>
              </div>

              <div className="resultGrid">
                <ResultItem label="Price" value={structured.price} />
                <ResultItem label="Currency" value={structured.currency} />
                <ResultItem label="Availability" value={structured.availability} />
                <ResultItem label="Minimum order" value={structured.minimum_order} />
                <ResultItem label="Delivery time" value={structured.delivery_time} />
                <ResultItem label="Payment terms" value={structured.payment_terms} />
                <ResultItem label="Additional fees" value={structured.additional_fees} />
                <ResultItem label="Notes" value={structured.notes} />
              </div>

              {callResult?.summary && (
                <div className="resultBox">
                  <span>AI summary</span>
                  <p>{callResult.summary}</p>
                </div>
              )}

              {callResult?.evidence && (
                <div className="resultBox">
                  <span>Evidence</span>
                  <pre>{formatValue(callResult.evidence)}</pre>
                </div>
              )}

              {callResult?.transcript && (
                <details className="transcript">
                  <summary>View call transcript</summary>
                  <pre>{callResult.transcript}</pre>
                </details>
              )}

              <div className="metadata">
                <div>
                  <span>CALL ID</span>
                  <strong>{callResult.call_id || "—"}</strong>
                </div>

                <div>
                  <span>Completed</span>
                  <strong>
                    {formatDate(callResult.updated_at || callResult.created_at)}
                  </strong>
                </div>
              </div>
            </>
          )}
        </section>

        <footer>
          <span>ProcureCall</span>
          <span className="dot">•</span>
          <span>Request ID: {id}</span>
        </footer>
      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .page {
    min-height: 100vh;
    background: #f5f6f8;
    color: #111820;
    padding: 32px 20px 70px;
    font-family: Arial, Helvetica, sans-serif;
  }

  .shell {
    width: min(1050px, 100%);
    margin: 0 auto;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 70px;
  }

  .brand {
    font-size: 13px;
    font-weight: 900;
    letter-spacing: .22em;
  }

  .back {
    color: #111820;
    text-decoration: none;
    font-size: 13px;
    border: 1px solid #dfe3e8;
    background: #fff;
    border-radius: 999px;
    padding: 10px 15px;
  }

  .hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 30px;
    margin-bottom: 34px;
  }

  .eyebrow {
    margin: 0 0 10px;
    color: #89929d;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: clamp(32px, 6vw, 56px);
    line-height: 1;
    letter-spacing: -.055em;
    max-width: 750px;
  }

  h2 {
    margin: 0;
    font-size: 22px;
    letter-spacing: -.025em;
  }

  .subtitle {
    margin: 15px 0 0;
    color: #68737f;
    line-height: 1.6;
  }

  .mono {
    font-family: monospace;
    font-size: 12px;
    word-break: break-all;
  }

  .heroActions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .pill,
  .requestStatus {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 9px 13px;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: .07em;
    white-space: nowrap;
  }

  .completed {
    background: #e7f7ed;
    color: #13743b;
  }

  .progress {
    background: #fff3d5;
    color: #8b5c00;
  }

  .waiting {
    background: #edf0f4;
    color: #5d6875;
  }

  .failed {
    background: #fdeaea;
    color: #a33131;
  }

  .requestStatus {
    background: #f0f2f5;
    color: #6b7580;
  }

  .refreshButton,
  button {
    border: 0;
    border-radius: 999px;
    padding: 10px 15px;
    background: #111820;
    color: white;
    cursor: pointer;
    font-weight: 700;
  }

  button:disabled {
    opacity: .55;
    cursor: default;
  }

  .card {
    background: white;
    border: 1px solid #e1e5e9;
    border-radius: 22px;
    padding: 28px;
    margin-bottom: 18px;
    box-shadow: 0 12px 40px rgba(17, 24, 32, .035);
  }

  .sectionHeader {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #edf0f2;
  }

  .requestGrid,
  .resultGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1px;
    margin-top: 22px;
    overflow: hidden;
    border: 1px solid #e7eaed;
    border-radius: 16px;
  }

  .resultGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .resultItem {
    min-width: 0;
    padding: 18px;
    background: #fbfcfd;
    border: 1px solid #edf0f2;
  }

  .resultItem span,
  .resultBox > span,
  .instructions > span,
  .fulfillment span,
  .metadata span {
    display: block;
    color: #89929d;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .1em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .resultItem strong {
    display: block;
    font-size: 14px;
    line-height: 1.5;
    word-break: break-word;
  }

  .instructions {
    margin-top: 20px;
    padding: 18px;
    background: #f7f8fa;
    border-radius: 15px;
  }

  .instructions p,
  .resultBox p {
    margin: 0;
    line-height: 1.65;
    white-space: pre-wrap;
  }

  .waitingBox {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    margin-top: 22px;
    padding: 20px;
    border-radius: 16px;
    background: #f6f8fa;
  }

  .waitingBox strong {
    display: block;
    margin-bottom: 6px;
  }

  .waitingBox p {
    margin: 0;
    color: #697481;
    line-height: 1.55;
  }

  .spinner {
    width: 24px;
    height: 24px;
    flex: 0 0 auto;
    border: 3px solid #dfe4e8;
    border-top-color: #111820;
    border-radius: 50%;
    animation: spin .8s linear infinite;
  }

  .spinner.small {
    width: 19px;
    height: 19px;
    border-width: 2px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .fulfillment {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-top: 22px;
  }

  .fulfillment > div {
    padding: 20px;
    border-radius: 16px;
    background: #f7f8fa;
  }

  .fulfillment strong {
    font-size: 20px;
  }

  .yes {
    color: #14733b;
  }

  .no {
    color: #a33131;
  }

  .resultBox {
    margin-top: 18px;
    padding: 20px;
    border: 1px solid #e5e8eb;
    border-radius: 16px;
    background: #fff;
  }

  .resultBox pre,
  .transcript pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font: inherit;
    line-height: 1.65;
  }

  .transcript {
    margin-top: 18px;
    border: 1px solid #e5e8eb;
    border-radius: 16px;
    overflow: hidden;
  }

  .transcript summary {
    padding: 16px 18px;
    cursor: pointer;
    font-weight: 700;
  }

  .transcript pre {
    padding: 18px;
    border-top: 1px solid #e5e8eb;
    background: #f8f9fa;
  }

  .metadata {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e7eaed;
  }

  .metadata strong {
    display: block;
    font-size: 12px;
    word-break: break-all;
  }

  .notice {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 18px;
    padding: 16px 18px;
    border-radius: 14px;
    line-height: 1.5;
  }

  .warning {
    background: #fff7df;
    color: #795600;
  }

  .error {
    background: #fdeaea;
    color: #963737;
  }

  .loadingCard,
  .errorCard {
    text-align: center;
    padding: 60px 28px;
  }

  .loadingCard .spinner {
    margin: 0 auto 20px;
  }

  .loadingCard h1,
  .errorCard h1 {
    font-size: 28px;
    margin: 0;
  }

  .loadingCard p,
  .errorCard p {
    color: #697481;
    line-height: 1.6;
  }

  .secondaryButton {
    display: inline-block;
    margin-left: 8px;
    color: #111820;
    text-decoration: none;
    border: 1px solid #dfe3e8;
    border-radius: 999px;
    padding: 10px 15px;
  }

  footer {
    display: flex;
    gap: 8px;
    align-items: center;
    color: #89929d;
    font-size: 10px;
    margin-top: 28px;
  }

  .dot {
    color: #c4c9ce;
  }

  @media (max-width: 720px) {
    .page {
      padding: 25px 14px 60px;
    }

    .header {
      margin-bottom: 45px;
    }

    .hero {
      flex-direction: column;
      align-items: flex-start;
    }

    .heroActions {
      width: 100%;
      justify-content: space-between;
    }

    .card {
      padding: 20px;
      border-radius: 18px;
    }

    .requestGrid,
    .resultGrid,
    .fulfillment,
    .metadata {
      grid-template-columns: 1fr;
    }
  }
`;