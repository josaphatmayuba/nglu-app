import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 });

const CLASSES = [
  { num: "1", label: "Comptes de capitaux" },
  { num: "2", label: "Comptes d'immobilisations" },
  { num: "3", label: "Comptes de stocks" },
  { num: "4", label: "Comptes de tiers" },
  { num: "5", label: "Comptes de trésorerie" },
  { num: "6", label: "Comptes de charges" },
  { num: "7", label: "Comptes de produits" },
  { num: "8", label: "Comptes de résultats" },
];

function AccountRow({ account, depth = 0 }) {
  const [open, setOpen] = useState(depth === 0);
  const children = account.children || [];
  const hasChildren = children.length > 0;
  const balance = Number(account.openingBalance || account.balance || 0);

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 hover:bg-ink-50 rounded-lg cursor-pointer transition ${depth > 0 ? "ml-4 border-l border-ink-100 pl-4" : ""}`}
        style={{ paddingLeft: depth > 0 ? `${(depth + 1) * 16}px` : "12px" }}
        onClick={() => hasChildren && setOpen((v) => !v)}
      >
        {hasChildren ? (
          open ? <ChevronDown className="w-3.5 h-3.5 text-ink-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-ink-400 shrink-0" />
        ) : (
          <span className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="font-mono text-xs text-ink-500 w-14 shrink-0">{account.accountNumber || account.id}</span>
        <span className={`text-sm flex-1 ${depth === 0 ? "font-semibold text-ink-900" : "text-ink-700"}`}>{account.name}</span>
        <span className={`text-sm font-medium tabular-nums ${balance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {balance !== 0 ? `CDF ${FMT.format(Math.abs(balance))}` : "—"}
        </span>
      </div>
      {open && hasChildren && children.map((child) => (
        <AccountRow key={child.id} account={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function PlanComptablePanel({ accounts = [], loading = false }) {
  // Group accounts by OHADA class (first digit of name or accountNumber)
  const byClass = {};
  CLASSES.forEach((c) => { byClass[c.num] = []; });

  accounts.forEach((a) => {
    const name = String(a.name || "");
    const num = String(a.accountNumber || a.id || "");
    const firstDigit = num[0] || name.match(/^(\d)/)?.[1] || "9";
    if (byClass[firstDigit]) {
      byClass[firstDigit].push(a);
    } else {
      (byClass["9"] = byClass["9"] || []).push(a);
    }
  });

  return (
    <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
        <h3 className="font-semibold text-ink-900 text-sm">Plan comptable OHADA</h3>
        <span className="text-xs text-ink-500">{accounts.length} compte{accounts.length !== 1 ? "s" : ""}</span>
      </div>

      {loading && (
        <div className="py-12 text-center text-ink-400 text-sm">Chargement…</div>
      )}

      {!loading && accounts.length === 0 && (
        <div className="py-12 text-center text-ink-400 text-sm">Aucun compte trouvé</div>
      )}

      {!loading && accounts.length > 0 && (
        <div className="p-3">
          {CLASSES.map((cls) => {
            const items = byClass[cls.num] || [];
            if (items.length === 0) return null;
            return (
              <div key={cls.num} className="mb-1">
                <AccountRow
                  account={{
                    id: cls.num,
                    accountNumber: `Classe ${cls.num}`,
                    name: cls.label,
                    balance: items.reduce((s, a) => s + Number(a.openingBalance || a.balance || 0), 0),
                    children: items,
                  }}
                  depth={0}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
