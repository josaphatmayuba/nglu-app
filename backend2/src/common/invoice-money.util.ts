// Argent des factures de vente/achat CRM legacy (bug #20 lot 2) : logique PURE.
// Tous les montants sont calcules en CENTIMES entiers (pas de flottant cumule,
// jamais d'arrondi a l'unite) : chaque ligne est arrondie au centime exact, les
// totaux sont la somme exacte des lignes. Les colonnes cibles sont en
// DECIMAL(18,2) : ce qui est stocke = ce qui est calcule ici, au centime pres.
// `tax` et `productDiscount` sont des TAUX en % (comportement existant inchange).

// Arrondi au centime exact, demi-centime eloigne de zero. toPrecision(15)
// neutralise l'artefact flottant (1.005 * 100 = 100.49999...).
export function toCents(value: unknown): number {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  const scaled = Number((Math.abs(num) * 100).toPrecision(15));
  return Math.sign(num) * Math.round(scaled);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Montant arrondi au centime exact (jamais a l'unite). */
export function money(value: unknown): number {
  return fromCents(toCents(value));
}

export type SaleLineInput = {
  productQuantity: number;
  productUnitSalePrice: number;
  productDiscount?: number;
  tax?: number;
};

export type SaleLineAmounts = {
  discount: number; // taux %
  tax: number; // taux %
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  finalAmount: number;
};

export function computeSaleLine(item: SaleLineInput): SaleLineAmounts & { cents: { discount: number; taxable: number; tax: number; final: number } } {
  const discount = item.productDiscount ?? 0;
  const tax = item.tax ?? 0;
  const subtotalC = toCents(item.productQuantity * item.productUnitSalePrice);
  const discountC = toCents(fromCents(subtotalC) * (discount / 100));
  const taxableC = subtotalC - discountC;
  const taxC = toCents(fromCents(taxableC) * (tax / 100));
  const finalC = taxableC + taxC;
  return {
    discount,
    tax,
    discountAmount: fromCents(discountC),
    taxableAmount: fromCents(taxableC),
    taxAmount: fromCents(taxC),
    finalAmount: fromCents(finalC),
    cents: { discount: discountC, taxable: taxableC, tax: taxC, final: finalC },
  };
}

/**
 * Totaux d'une facture de vente. `purchasePrices[i]` = prix d'achat unitaire du
 * produit de la ligne i (cout des ventes).
 */
export function computeSaleTotals(
  lines: SaleLineInput[],
  purchasePrices: number[],
  payments: Array<{ amount: number }>,
) {
  const computed = lines.map(computeSaleLine);
  let totalC = 0;
  let taxC = 0;
  let discountC = 0;
  let costC = 0;
  computed.forEach((l, i) => {
    totalC += l.cents.taxable;
    taxC += l.cents.tax;
    discountC += l.cents.discount;
    costC += toCents(lines[i].productQuantity * (purchasePrices[i] ?? 0));
  });
  const paidC = payments.reduce((s, p) => s + toCents(p.amount), 0);
  return {
    lines: computed,
    totalAmount: fromCents(totalC),
    totalTaxAmount: fromCents(taxC),
    totalDiscountAmount: fromCents(discountC),
    totalPurchasePrice: fromCents(costC),
    receivable: fromCents(totalC + taxC),
    paidAmount: fromCents(paidC),
    dueAmount: fromCents(totalC + taxC - paidC),
    profit: fromCents(totalC - costC),
  };
}

export type PurchaseLineInput = {
  productQuantity: number;
  productUnitPurchasePrice: number;
  tax?: number;
};

export function computePurchaseTotals(lines: PurchaseLineInput[], payments: Array<{ amount: number }>) {
  let totalC = 0;
  let taxTotalC = 0;
  const computed = lines.map((item) => {
    const tax = item.tax ?? 0;
    const lineC = toCents(item.productQuantity * item.productUnitPurchasePrice);
    const taxC = toCents(fromCents(lineC) * (tax / 100));
    totalC += lineC;
    taxTotalC += taxC;
    return { tax, taxAmount: fromCents(taxC), finalAmount: fromCents(lineC + taxC) };
  });
  const paidC = payments.reduce((s, p) => s + toCents(p.amount), 0);
  return {
    lines: computed,
    totalPurchasePrice: fromCents(totalC),
    totalTax: fromCents(taxTotalC),
    paidAmount: fromCents(paidC),
    dueAmount: fromCents(totalC + taxTotalC - paidC),
  };
}
