"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function NewRequestPage() {
  const [supplierPhones, setSupplierPhones] = useState([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [requestId, setRequestId] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const formData = new FormData(form);

    const phones = supplierPhones.map((phone) => phone.trim()).filter(Boolean);

    const payload = {
      productOrService: String(formData.get("productOrService") ?? ""),
      quantity: String(formData.get("quantity") ?? ""),
      targetBudget: String(formData.get("targetBudget") ?? ""),
      deliveryLocation: String(formData.get("deliveryLocation") ?? ""),
      supplierPhones: phones,
      instructions: String(formData.get("instructions") ?? ""),
    };

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Failed to save procurement request.",
        );
      }

      const createdRequestId = result?.request?.id;

      if (!createdRequestId) {
        throw new Error(
          "Request was created, but no request ID was returned.",
        );
      }

      setRequestId(createdRequestId);
      setSuccess(
        `Request created successfully. ID: ${createdRequestId}`,
      );

      form.reset();
      setSupplierPhones([""]);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#111111]">
      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between border-b border-black/10 pb-6">
          <div>
            <Link href="/" className="text-xl font-semibold tracking-tight">
              ProcureCall
            </Link>
            <p className="mt-1 text-sm text-black/50">
              AI calls. You choose.
            </p>
          </div>

          <Link
            href="/"
            className="text-sm text-black/50 transition hover:text-black"
          >
            Back
          </Link>
        </header>

        <section className="py-12">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-black/40">
              New request
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              What do you need?
            </h1>

            <p className="mt-4 text-base leading-7 text-black/60">
              Tell ProcureCall what you need. We will use the request to
              prepare an AI phone conversation with the supplier.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 max-w-3xl space-y-6">
            <div>
              <label
                htmlFor="productOrService"
                className="mb-2 block text-sm font-medium"
              >
                Product or service
              </label>
              <input
                id="productOrService"
                name="productOrService"
                type="text"
                required
                placeholder="e.g. 5,000 litres of diesel"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm outline-none transition placeholder:text-black/30 focus:border-black/30"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="quantity"
                  className="mb-2 block text-sm font-medium"
                >
                  Quantity
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="text"
                  placeholder="e.g. 5,000 litres"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm outline-none transition placeholder:text-black/30 focus:border-black/30"
                />
              </div>

              <div>
                <label
                  htmlFor="targetBudget"
                  className="mb-2 block text-sm font-medium"
                >
                  Target budget
                  <span className="ml-2 font-normal text-black/40">
                    Optional
                  </span>
                </label>
                <input
                  id="targetBudget"
                  name="targetBudget"
                  type="text"
                  placeholder="e.g. ₦1,250 per litre"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm outline-none transition placeholder:text-black/30 focus:border-black/30"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="deliveryLocation"
                className="mb-2 block text-sm font-medium"
              >
                Delivery location
              </label>
              <input
                id="deliveryLocation"
                name="deliveryLocation"
                type="text"
                placeholder="e.g. Calabar, Cross River"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm outline-none transition placeholder:text-black/30 focus:border-black/30"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-4">
                <label className="block text-sm font-medium">
                  Supplier phone numbers
                </label>
                <button
                  type="button"
                  onClick={() => setSupplierPhones((current) => [...current, ""])}
                  className="text-sm font-medium text-black/60 hover:text-black"
                >
                  + Add supplier
                </button>
              </div>

              <div className="space-y-3">
                {supplierPhones.map((phone, index) => (
                  <div key={index} className="flex gap-3">
                    <input
                      name="supplierPhone"
                      type="tel"
                      required={index === 0}
                      value={phone}
                      onChange={(event) =>
                        setSupplierPhones((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? event.target.value : item,
                          ),
                        )
                      }
                      placeholder="+1 555 123 4567"
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm outline-none transition placeholder:text-black/30 focus:border-black/30"
                    />
                    {supplierPhones.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSupplierPhones((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        className="px-2 text-sm text-black/40 hover:text-red-700"
                        aria-label={`Remove supplier ${index + 1}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <p className="mt-2 text-xs leading-5 text-black/40">
                Add two or more suppliers to compare their offers. Numbers are
                only used when you start the supplier call.
              </p>
            </div>

            <div>
              <label
                htmlFor="instructions"
                className="mb-2 block text-sm font-medium"
              >
                What should ProcureCall ask?
              </label>
              <textarea
                id="instructions"
                name="instructions"
                rows={5}
                placeholder="Ask about availability, best price, minimum order, delivery time, payment terms, and any additional fees."
                className="w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm leading-6 outline-none transition placeholder:text-black/30 focus:border-black/30"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <div className="pt-2">
              {requestId ? (
                <Link
                  href={`/requests/review?id=${requestId}`}
                  className="inline-block w-full rounded-full bg-[#111111] px-6 py-4 text-center text-sm font-medium text-white transition hover:bg-black/80 sm:w-auto"
                >
                  Review procurement request
                </Link>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-[#111111] px-6 py-4 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isSubmitting
                    ? "Saving request..."
                    : "Review procurement request"}
                </button>
              )}
            </div>
          </form>
        </section>

        <footer className="border-t border-black/10 py-6 text-xs text-black/40">
          ProcureCall · AI calls. You choose.
        </footer>
      </div>
    </main>
  );
}