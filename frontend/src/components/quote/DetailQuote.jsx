import { ChevronLeft } from "lucide-react";
import moment from "moment";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";

import { clearQuote, loadSingleQuote } from "../../redux/rtk/features/quote/quoteSlice";
import QuoteSlip from "../Invoice/QuoteSlip";
import { useDefaultCurrencySymbol } from "@/utils/useDefaultCurrency";

const fmtDate = (d) => (d ? moment(d).locale("fr").format("D MMM YYYY") : "—");

const DetailQuote = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const currencySymbol = useDefaultCurrencySymbol();

  const { quote, loading } = useSelector((state) => state.quotes);

  useEffect(() => {
    dispatch(loadSingleQuote(id));
    return () => dispatch(clearQuote());
  }, [dispatch, id]);

  const fmtMoney = (n) =>
    `${currencySymbol || "CDF"} ${Math.round(Number(n || 0)).toLocaleString("fr-FR")}`;

  if (loading || !quote) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[#f7f8fa] px-3 sm:px-5 py-4">
        <p className="text-ink-500 text-sm">Chargement…</p>
      </div>
    );
  }

  const customerName =
    quote.customer?.username
    || [quote.customer?.firstName, quote.customer?.lastName].filter(Boolean).join(" ")
    || "—";

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f7f8fa] px-3 sm:px-5 py-4">
      <div className="flex items-center gap-2 text-sm text-ink-500 mb-4">
        <Link to="/admin/quote" className="hover:text-ink-900 inline-flex items-center gap-1.5">
          <ChevronLeft className="w-4 h-4" />
          Devis
        </Link>
        <span>/</span>
        <span className="text-ink-900 font-medium">{quote.quoteName || `#${quote.id}`}</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl md:text-2xl font-semibold text-ink-900 tracking-tight">
          {quote.quoteName || `Devis #${quote.id}`}
        </h1>
        <QuoteSlip data={quote} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-ink-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-xs text-ink-500 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Produit</th>
                <th className="text-right px-4 py-3 font-medium">Qté</th>
                <th className="text-right px-4 py-3 font-medium">Prix unit.</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {(quote.quoteProduct || []).map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3 text-ink-900">{line.product?.name || line.productId}</td>
                  <td className="px-4 py-3 text-right text-ink-600">{line.productQuantity}</td>
                  <td className="px-4 py-3 text-right text-ink-600">{fmtMoney(line.productUnitSalePrice)}</td>
                  <td className="px-4 py-3 text-right font-medium text-ink-900">{fmtMoney(line.productFinalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-ink-100 px-4 py-3 flex justify-end">
            <div className="w-full max-w-xs flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-900">Total</span>
              <span className="text-lg font-semibold text-ink-900">{fmtMoney(quote.totalAmount)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-ink-200 p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">Détails</h3>
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">Client</span>
            <span className="text-ink-900 font-medium">{customerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">Date</span>
            <span className="text-ink-900 font-medium">{fmtDate(quote.quoteDate)}</span>
          </div>
          {quote.note && (
            <div className="pt-2 border-t border-ink-100">
              <span className="text-ink-500 text-xs">Note</span>
              <p className="text-ink-900 text-sm mt-1 whitespace-pre-wrap">{quote.note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailQuote;
