// KodaTill — utilitaire d'export CSV cote client (SCRUM-308).
// Aucun pattern generique existant ailleurs dans le repo (grep dlCSV/downloadCSV/
// exportCSV sur farmos-app/ et les autres apps : rien trouve), donc petite
// fonction reutilisable ici plutot que du code inline dans RapportsScreen.

// Echappe une valeur pour une cellule CSV (RFC 4180 simplifie) : entoure de
// guillemets si la valeur contient une virgule, un guillemet ou un retour a
// la ligne (\n ou \r) ; double les guillemets internes.
//
// Neutralise aussi l'injection de formule CSV : une valeur commencant par
// =, +, -, @, tabulation ou retour chariot peut etre interpretee comme une
// formule/commande par Excel/LibreOffice a l'ouverture du fichier (ex:
// =HYPERLINK(...) ou =cmd|...). Des champs texte libre saisis par
// l'utilisateur (libelle de depense, nom de categorie) sont exportes tels
// quels dans RapportsScreen (SCRUM-308), donc pas d'hypothese possible sur
// leur contenu. On prefixe d'une apostrophe avant l'echappement RFC 4180
// normal : le tableur affiche la valeur en texte brut (lisibilite preservee)
// sans l'executer.
function escapeCsvCell(value) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// rows = array de lignes homogenes (array de valeurs). Prefixe le fichier
// avec un BOM UTF-8 pour un affichage correct des accents dans Excel.
export function rowsToCsv(rows) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

// Declenche le telechargement navigateur d'un contenu CSV.
export function downloadCsv(filename, rows) {
  const csv = "﻿" + rowsToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
