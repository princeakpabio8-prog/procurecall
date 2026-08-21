export type ProcurementRequestInput = {
  quantity?: string | number | null;
  target_budget?: string | number | null;
  delivery_location?: string | null;
};

export type SupplierOfferInput = Record<string, unknown>;

export type OfferAnalysis = {
  requestedQuantity: number | null;
  unitPrice: number | null;
  minimumOrder: number | null;
  requiredOrderQuantity: number | null;
  requestedSubtotal: number | null;
  minimumOrderSubtotal: number | null;
  fees: number | null;
  estimatedTotal: number | null;
  budget: number | null;
  budgetDifference: number | null;
  budgetStatus: "within_budget" | "over_budget" | "unknown";
  fulfillment: "yes" | "no" | "unknown";
  responseStatus: "received" | "partial" | "not_received";
  quantityMatch: "match" | "not_match" | "unknown";
  budgetMatch: "match" | "not_match" | "unknown";
  availabilityMatch: "match" | "unknown";
  deliveryMatch: "match" | "unknown";
  meaningfulOffer: boolean;
  qualifies: boolean;
};

function numberFrom(value: unknown) {
  const match = String(value ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function textFrom(offer: SupplierOfferInput, key: string) {
  return String(offer[key] ?? "").trim().toLowerCase();
}

function isKnown(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase();
  return Boolean(text && text !== "unknown" && text !== "not provided");
}

function hasDeliveryMatch(request: ProcurementRequestInput, offer: SupplierOfferInput) {
  if (!request.delivery_location || !isKnown(offer.delivery_time)) return "unknown" as const;
  return "match" as const;
}

export function analyzeOffer(
  request: ProcurementRequestInput,
  offer: SupplierOfferInput,
): OfferAnalysis {
  const requestedQuantity = numberFrom(request.quantity);
  const unitPrice = numberFrom(offer.price);
  const minimumOrder = numberFrom(offer.minimum_order);
  const requiredOrderQuantity = requestedQuantity === null
    ? minimumOrder
    : Math.max(requestedQuantity, minimumOrder ?? requestedQuantity);
  const requestedSubtotal = unitPrice !== null && requestedQuantity !== null
    ? unitPrice * requestedQuantity
    : null;
  const minimumOrderSubtotal = unitPrice !== null && requiredOrderQuantity !== null
    ? unitPrice * requiredOrderQuantity
    : null;
  const fees = numberFrom(offer.additional_fees);
  const estimatedTotal = minimumOrderSubtotal === null
    ? null
    : minimumOrderSubtotal + (fees ?? 0);
  const budget = numberFrom(request.target_budget);
  const budgetDifference = budget !== null && estimatedTotal !== null
    ? estimatedTotal - budget
    : null;
  const budgetStatus = budgetDifference === null
    ? "unknown"
    : budgetDifference <= 0
      ? "within_budget"
      : "over_budget";
  const fulfillmentText = textFrom(offer, "supplier_can_fulfill");
  const fulfillment = fulfillmentText === "yes"
    ? "yes"
    : fulfillmentText === "no"
      ? "no"
      : "unknown";
  const hasAnyOffer = [
    offer.price,
    offer.availability,
    offer.delivery_time,
    offer.minimum_order,
    offer.payment_terms,
    offer.additional_fees,
    offer.notes,
  ].some(isKnown);
  const responseStatus = !hasAnyOffer
    ? "not_received"
    : [offer.price, offer.availability, offer.delivery_time, offer.minimum_order]
        .every(isKnown)
      ? "received"
      : "partial";
  const quantityMatch = minimumOrder === null || requestedQuantity === null
    ? "unknown"
    : minimumOrder <= requestedQuantity
      ? "match"
      : "not_match";
  const budgetMatch = budgetStatus === "unknown"
    ? "unknown"
    : budgetStatus === "within_budget"
      ? "match"
      : "not_match";
  const availabilityMatch = isKnown(offer.availability) ? "match" : "unknown";
  const deliveryMatch = hasDeliveryMatch(request, offer);
  const qualifies = responseStatus === "received" &&
    fulfillment === "yes" &&
    (quantityMatch === "match" || quantityMatch === "unknown") &&
    (budgetMatch === "match" || budgetMatch === "unknown");

  return {
    requestedQuantity,
    unitPrice,
    minimumOrder,
    requiredOrderQuantity,
    requestedSubtotal,
    minimumOrderSubtotal,
    fees,
    estimatedTotal,
    budget,
    budgetDifference,
    budgetStatus,
    fulfillment,
    responseStatus,
    quantityMatch,
    budgetMatch,
    availabilityMatch,
    deliveryMatch,
    meaningfulOffer: hasAnyOffer,
    qualifies,
  };
}

export function recommendationFor<T extends { structured_result?: unknown; status?: unknown }>(
  request: ProcurementRequestInput,
  results: T[],
) {
  const candidates = results.map((result) => {
    const offer = result.structured_result && typeof result.structured_result === "object"
      ? result.structured_result as SupplierOfferInput
      : {};
    const analysis = analyzeOffer(request, offer);
    const score = (analysis.qualifies ? 1000 : 0) +
      (analysis.fulfillment === "yes" ? 100 : 0) +
      (analysis.budgetStatus === "within_budget" ? 80 : 0) +
      (analysis.quantityMatch === "match" ? 60 : 0) +
      (analysis.availabilityMatch === "match" ? 40 : 0) +
      (analysis.deliveryMatch === "match" ? 40 : 0) +
      (analysis.unitPrice !== null ? 20 : 0) +
      (analysis.responseStatus === "received" ? 20 : analysis.responseStatus === "partial" ? 5 : 0);
    return { result, analysis, score };
  }).sort((left, right) => right.score - left.score);

  const qualified = candidates.find((candidate) => candidate.analysis.qualifies);
  if (qualified) return { kind: "recommended" as const, ...qualified };

  const fallback = candidates.find((candidate) => candidate.analysis.meaningfulOffer);
  if (fallback) return { kind: "best_available" as const, ...fallback };

  return null;
}
