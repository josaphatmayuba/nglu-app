/**
 * Parsing heuristique best-effort d'un texte OCR de devis/bon de commande
 * fournisseur (BâtiPro). Regex simples, pas de sur-ingénierie : on retourne
 * ce qu'on trouve, undefined pour le reste. Le formulaire de création de
 * document reste éditable par l'utilisateur — cette extraction n'est qu'une
 * pré-remplissage.
 */

export interface ParsedDocumentLine {
  designation: string;
  quantity?: number;
  unitPrice?: number;
}

export interface ParsedSupplierDocument {
  supplierName?: string;
  documentNumber?: string;
  date?: string;
  totalHt?: number;
  totalTtc?: number;
  lines: ParsedDocumentLine[];
}

function toNumber(raw: string): number | undefined {
  const normalized = raw.replace(/\s/g, "").replace(/,/g, ".").replace(/\.(?=.*\.)/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

export function parseSupplierDocument(text: string): ParsedSupplierDocument {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // N° devis / bon de commande : "Devis N° 2024-001", "BC n°123", "N° 45678"
  let documentNumber: string | undefined;
  const numberMatch = text.match(/(?:devis|bon de commande|bc|facture)?\s*n[°ºo]\s*[:\-]?\s*([A-Za-z0-9\-\/]+)/i);
  if (numberMatch) documentNumber = numberMatch[1];

  // Date au format JJ/MM/AAAA ou JJ-MM-AAAA
  let date: string | undefined;
  const dateMatch = text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/);
  if (dateMatch) date = dateMatch[1];

  // Totaux : "Total TTC : 1 234,56", "Total HT 1234.56"
  let totalTtc: number | undefined;
  const ttcMatch = text.match(/total\s*ttc\s*[:\-]?\s*([\d\s.,]+)/i);
  if (ttcMatch) totalTtc = toNumber(ttcMatch[1]);

  let totalHt: number | undefined;
  const htMatch = text.match(/total\s*ht\s*[:\-]?\s*([\d\s.,]+)/i);
  if (htMatch) totalHt = toNumber(htMatch[1]);
  if (totalHt === undefined) {
    const genericTotalMatch = text.match(/\btotal\s*[:\-]?\s*([\d\s.,]+)/i);
    if (genericTotalMatch && totalTtc === undefined) totalTtc = toNumber(genericTotalMatch[1]);
  }

  // Nom fournisseur : best-effort, on prend la première ligne "propre" du document
  // (pas une ligne clé/valeur type Total/TVA/N°/Devis) parmi les 5 premières lignes.
  let supplierName: string | undefined;
  const skipKeywords = /total|tva|n[°ºo]|devis|bon de commande|facture|date/i;
  for (const line of lines.slice(0, 5)) {
    if (!skipKeywords.test(line) && line.length >= 3) {
      supplierName = line;
      break;
    }
  }

  // Lignes de détail : "Désignation ... quantité x prix unitaire"
  // Heuristique : ligne contenant au moins deux nombres (quantité, prix unitaire).
  const detailLines: ParsedDocumentLine[] = [];
  const lineItemRegex = /^(.{3,80}?)\s+(\d+(?:[.,]\d+)?)\s*(?:x|X|\*)?\s*(\d+(?:[.,]\d+)?)\s*(?:€|\$|USD|CDF|FC)?$/;
  for (const line of lines) {
    if (skipKeywords.test(line)) continue;
    const match = line.match(lineItemRegex);
    if (match) {
      const designation = match[1].trim();
      const quantity = toNumber(match[2]);
      const unitPrice = toNumber(match[3]);
      if (designation) detailLines.push({ designation, quantity, unitPrice });
    }
  }

  return {
    supplierName,
    documentNumber,
    date,
    totalHt,
    totalTtc,
    lines: detailLines,
  };
}
