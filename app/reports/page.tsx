"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type AnyObject = Record<string, any>;

function offerValue(offer: AnyObject, key: string) {
  const value = offer[key];
  return value === null || value === undefined || value === ""
    ? "Unknown"
    : String(value);
}

function formatOfferPrice(offer: AnyObject) {
  const price = offerValue(offer, "price");
  const currency = offerValue(offer, "currency").toLowerCase();
  const symbol = currency === "naira" || currency === "ngn" ? "₦" : "";
  const match = price.match(
    /^(?:₦|ngn|naira)?\s*([\d,]+(?:\.\d+)?)\s*(?:₦|ngn|naira)?\s+(?:per|\/)\s+(.+)$/i,
  );
  return match ? `${symbol}${match[1]} / ${match[2]}` : `${symbol}${price}`;
}

function supplierOffer(offer: AnyObject) {
  return [
    ["Price", formatOfferPrice(offer)],
    ["Availability", offerValue(offer, "availability")],
    ["Delivery", offerValue(offer, "delivery_time")],
    ["Minimum order", offerValue(offer, "minimum_order")],
    ["Payment terms", offerValue(offer, "payment_terms")],
    ["Additional fees", offerValue(offer, "additional_fees")],
    ["Can fulfill request", offerValue(offer, "supplier_can_fulfill")],
  ];
}

function evidenceItems(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, item]) => `${key}: ${String(item)}`);
  }
  return [];
}

export default function CallReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState("");
  const [data, setData] = useState<AnyObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ id }) => setId(id));
  }, [params]);

  const load = useCallback(async () => {
    if (!id) return;

    try {
      const res = await fetch(`/api/requests/${id}/call`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || json?.message || `Request failed: ${res.status}`);
      }

      setData(json);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load report.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    load();

    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [id, load]);

  const request = data?.request || {};
  const call =
    data?.call ||
    data?.result ||
    data?.call_result ||
    data?.data ||
    {};

  const rawStatus = String(
    call?.status || call?.outcome || data?.status || "queued"
  ).toLowerCase();

  const completed =
    call?.completed === true ||
    ["completed", "complete", "finished", "ended", "successful", "success"].includes(rawStatus);

  const inProgress =
    ["in_progress", "in-progress", "ringing", "answered", "active", "processing"].includes(rawStatus);

  const status = completed
    ? "COMPLETED"
    : inProgress
      ? "IN PROGRESS"
      : ["failed", "failure", "error", "cancelled", "canceled", "no_answer", "no-answer"].includes(rawStatus)
        ? "FAILED"
        : "WAITING FOR RESULT";

  const summary = call?.summary || call?.notes || call?.outcome || "";
  const offer = call?.structured_result;

  return (
    <main className="page">
      <div className="shell">
        <div className="brand">PROCURECALL</div>

        <div className="top">
          <div>
            <p className="eyebrow">CALL REPORT</p>
            <h1>Supplier call report</h1>
            <p className="subtitle">
              This report is separate from the AI caller and updates automatically.
            </p>
          </div>

          <Link href="/requests" className="back">
            Back to requests
          </Link>
        </div>

        {loading ? (
          <section className="card">
            <h2>Loading report...</h2>
          </section>
        ) : error ? (
          <section className="card error">
            <h2>Unable to load report</h2>
            <p>{error}</p>
            <button onClick={load}>Try again</button>
          </section>
        ) : (
          <>
            <section className="card">
              <p className="label">REQUEST</p>
              <h2>{request.product_or_service || "Procurement request"}</h2>

              <div className="grid">
                <div>
                  <span>Quantity</span>
                  <strong>{request.quantity ?? "—"}</strong>
                </div>
                <div>
                  <span>Target budget</span>
                  <strong>{request.target_budget ?? "—"}</strong>
                </div>
                <div>
                  <span>Delivery</span>
                  <strong>{request.delivery_location || "—"}</strong>
                </div>
                <div>
                  <span>Supplier</span>
                  <strong>{request.phone || request.supplier || "—"}</strong>
                </div>
              </div>

              {request.instructions && (
                <div className="instructions">
                  <span>Call instructions</span>
                  <p>{request.instructions}</p>
                </div>
              )}
            </section>

            <section className="card">
              <div className="resultHead">
                <div>
                  <p className="label">CALL RESULT</p>
                  <h2>{status}</h2>
                </div>
                <div className={`pill ${status.toLowerCase().replaceAll(" ", "-")}`}>
                  {status}
                </div>
              </div>

              {!completed && (
                <div className="waiting">
                  <strong>
                    {inProgress
                      ? "The supplier call is in progress."
                      : "Waiting for the call result."}
                  </strong>
                  <p>
                    This page checks automatically every 5 seconds. No new call is required.
                  </p>
                </div>
              )}

              {completed && (
                <>
                  <div className="resultBox">
                    <span>Outcome</span>
                    <p>{call.outcome || "Completed"}</p>
                  </div>

                  {summary && (
                    <div className="resultBox">
                      <span>AI summary</span>
                      <p>{summary}</p>
                    </div>
                  )}

                  {offer && typeof offer === "object" && (
                    <div className="resultBox offerCard">
                      <span>Supplier offer</span>
                      <div className="offerGrid">
                        {supplierOffer(offer).map(([label, value]) => (
                          <div key={label}>
                            <small>{label}</small>
                            <strong>{value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {call?.evidence && (
                    <div className="resultBox">
                      <span>Evidence</span>
                      <ul className="evidenceList">
                        {evidenceItems(call.evidence).map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {call.transcript && (
                    <div className="resultBox">
                      <span>Transcript</span>
                      <pre>{call.transcript}</pre>
                    </div>
                  )}

                  <div className="resultBox">
                    <span>Completed at</span>
                    <p>
                      {call.completed_at ||
                        call.ended_at ||
                        "Completion time not supplied"}
                    </p>
                  </div>
                </>
              )}

              <div className="footer">
                Request ID: {id}
              </div>
            </section>
          </>
        )}
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f7f8fa;
          color: #17202a;
          padding: 48px 20px 80px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .shell {
          width: min(980px, 100%);
          margin: auto;
        }

        .brand {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: .22em;
          margin-bottom: 42px;
        }

        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 32px;
        }

        .eyebrow, .label {
          color: #7b8592;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .12em;
          margin: 0 0 10px;
        }

        h1 {
          font-size: clamp(30px, 5vw, 46px);
          letter-spacing: -.04em;
          margin: 0;
        }

        h2 {
          margin: 0;
          font-size: 24px;
          letter-spacing: -.025em;
        }

        .subtitle {
          color: #687382;
          line-height: 1.6;
          margin-top: 12px;
        }

        .back {
          white-space: nowrap;
          text-decoration: none;
          color: #17202a;
          background: white;
          border: 1px solid #dce1e7;
          border-radius: 999px;
          padding: 11px 17px;
        }

        .card {
          background: white;
          border: 1px solid #e3e7ec;
          border-radius: 22px;
          padding: 28px;
          margin-bottom: 20px;
          box-shadow: 0 10px 35px rgba(23,32,42,.04);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-top: 28px;
        }

        .grid span, .resultBox span, .instructions span {
          display: block;
          color: #8a94a1;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          margin-bottom: 7px;
        }

        .instructions {
          margin-top: 28px;
          padding: 18px;
          background: #f7f8fa;
          border-radius: 14px;
        }

        .instructions p {
          margin: 0;
          line-height: 1.5;
        }

        .resultHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .pill {
          border-radius: 999px;
          padding: 9px 13px;
          font-size: 11px;
          font-weight: 800;
        }

        .completed {
          background: #e8f7ed;
          color: #16723a;
        }

        .in-progress {
          background: #fff5db;
          color: #8a5a00;
        }

        .waiting-for-result {
          background: #eef1f5;
          color: #596574;
        }

        .failed {
          background: #fdecec;
          color: #a33131;
        }

        .waiting {
          margin-top: 26px;
          padding: 20px;
          border-radius: 15px;
          background: #f7f9fb;
        }

        .waiting p {
          color: #6e7885;
          margin: 7px 0 0;
          line-height: 1.5;
        }

        .resultBox {
          margin-top: 16px;
          padding: 18px;
          border: 1px solid #e5e9ee;
          border-radius: 14px;
          background: #fafbfc;
        }

        .resultBox p {
          margin: 0;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .resultBox pre {
          white-space: pre-wrap;
          margin: 0;
          font: inherit;
          line-height: 1.6;
        }

        .offerGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .offerGrid small,
        .offerGrid strong {
          display: block;
        }

        .offerGrid small {
          color: #8a94a1;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .offerGrid strong {
          margin-top: 5px;
          font-size: 15px;
        }

        .evidenceList {
          margin: 0;
          padding-left: 18px;
          line-height: 1.6;
        }

        .footer {
          margin-top: 25px;
          padding-top: 18px;
          border-top: 1px solid #e8ebef;
          color: #929ba7;
          font-size: 11px;
          word-break: break-all;
        }

        .error {
          border-color: #efcccc;
        }

        .error p {
          color: #8d3b3b;
        }

        @media (max-width: 680px) {
          .offerGrid {
            grid-template-columns: 1fr;
          }
        }

        button {
          border: 0;
          border-radius: 999px;
          padding: 11px 17px;
          background: #17202a;
          color: white;
          cursor: pointer;
        }

        @media (max-width: 680px) {
          .page { padding: 30px 15px 60px; }
          .top { flex-direction: column; align-items: flex-start; }
          .grid { grid-template-columns: 1fr; }
          .resultHead { flex-direction: column; align-items: flex-start; }
          .card { padding: 20px; border-radius: 17px; }
        }
      `}</style>
    </main>
  );
}
