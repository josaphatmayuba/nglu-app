import { Link, useNavigate } from "react-router-dom";
import moment from "moment";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { loadAllQuote } from "../../redux/rtk/features/quote/quoteSlice";
import { useDefaultCurrencySymbol } from "@/utils/useDefaultCurrency";

const fmtDate = (d) => (d ? moment(d).locale("fr").format("D MMM YYYY") : "—");

const GetAllQuote = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const currencySymbol = useDefaultCurrencySymbol();

  const { list, loading } = useSelector((state) => state.quotes);

  useEffect(() => {
    dispatch(loadAllQuote({ query: "all" }));
  }, [dispatch]);

  const safeList = Array.isArray(list) ? list : [];

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return safeList;
    return safeList.filter((item) => {
      const haystack = [
        item.quoteName,
        item.id,
        item.customer?.username,
        item.customer?.firstName,
        item.customer?.lastName,
        String(item.totalAmount || ""),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [safeList, searchTerm]);

  const fmtMoney = (n) =>
    `${currencySymbol || "CDF"} ${Math.round(Number(n || 0)).toLocaleString("fr-FR")}`;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f7f8fa] px-3 sm:px-5 py-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-ink-900 tracking-tight">
            Devis
          </h1>
          <p className="text-xs md:text-sm text-ink-500 mt-1">
            Tous les devis envoyés aux clients
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher devis, client..."
              className="pl-8 pr-3 py-1.5 bg-white border border-ink-200 rounded-md text-sm w-64 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <button
            onClick={() => navigate("/admin/quote/add")}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau devis</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-ink-50 text-xs text-ink-500 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-medium">N° Devis</th>
                <th className="text-left px-4 py-3 font-medium">Client</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-right px-4 py-3 font-medium">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-ink-500">
                    Chargement…
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="text-ink-700 font-medium mb-1">Aucun devis</div>
                    <div className="text-xs text-ink-500">
                      {searchTerm
                        ? `Aucun résultat pour « ${searchTerm} »`
                        : "Créez votre premier devis."}
                    </div>
                  </td>
                </tr>
              )}

              {filtered.map((item) => {
                const customerName =
                  item.customer?.username
                  || [item.customer?.firstName, item.customer?.lastName]
                    .filter(Boolean).join(" ")
                  || "—";
                return (
                  <tr key={item.id} className="hover:bg-ink-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-ink-700">
                      <Link to={`/admin/quote/${item.id}`} className="hover:text-indigo-700">
                        {item.quoteName || `#${item.id}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-900">{customerName}</td>
                    <td className="px-4 py-3 text-ink-600">{fmtDate(item.quoteDate)}</td>
                    <td className="px-4 py-3 text-right font-medium text-ink-900">
                      {fmtMoney(item.totalAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GetAllQuote;
