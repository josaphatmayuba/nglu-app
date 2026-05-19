// Central Redux + memo hook for the Property Management screens.
//
// This is the single entry point every module (Properties, Tenants, Leases,
// Payments, Maintenance) consumes to access slice data, derived collections
// (enrichedUnits, KPIs, payment buckets…) and the bootstrap dispatchers.
//
// The legacy PropertyManagement.jsx duplicates this logic inline; both stay
// in sync until the cutover (Phase F) removes the legacy file.

import moment from "moment";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { loadAllAccount } from "../../../redux/rtk/features/account/accountSlice";
import { loadAllCurrency } from "../../../redux/rtk/features/eCommerce/currency/currencySlice";
import {
  loadContractTemplates,
  loadContracts,
  loadPropertyManagement,
} from "../../../redux/rtk/features/propertyManagement/propertyManagementSlice";

import { buildCurrencyOptions, cleanCurrencySymbol } from "./format";
import { getUnitKind } from "./units";
import { typeLabel } from "./constants";

// Groups leases by currencyId, returning [{currencyId, currencySymbol, amount}].
const groupLeasesByCurrency = (leases, currencyById) => {
  const map = {};
  leases.forEach((lease) => {
    const cid = lease.currencyId ?? "default";
    if (!map[cid]) {
      const currency = currencyById[cid];
      map[cid] = {
        currencyId: cid,
        currencySymbol: (currency ? cleanCurrencySymbol(currency) : null) || "CDF",
        amount: 0,
      };
    }
    map[cid].amount += Number(lease.rentAmount || 0);
  });
  return Object.values(map);
};

// Groups payments by currencyId, returning [{currencyId, currencySymbol, amount}].
const groupPaymentsByCurrency = (pmts) => {
  const map = {};
  pmts.forEach((p) => {
    const cid = p.currencyId ?? "default";
    if (!map[cid]) {
      map[cid] = {
        currencyId: cid,
        currencySymbol: p.currencySymbol || p.currencyName || "CDF",
        amount: 0,
      };
    }
    map[cid].amount += Number(p.amount || 0);
  });
  return Object.values(map);
};

export const usePropertyManagementData = () => {
  const dispatch = useDispatch();

  const {
    dashboard,
    properties,
    units,
    tenants,
    onboarding,
    leases,
    payments,
    maintenance,
    contracts,
    contractTemplates,
    loading,
  } = useSelector((state) => state.propertyManagement);
  const accounts = useSelector((state) => state.accounts?.list) || [];
  const currencyList = useSelector((state) => state.currency?.list) || [];

  useEffect(() => {
    dispatch(loadPropertyManagement());
    dispatch(loadAllAccount());
    dispatch(loadContracts());
    dispatch(loadContractTemplates());
    dispatch(loadAllCurrency());
  }, [dispatch]);

  // ─── Safe collections (filter out nulls coming from the API) ─────────
  const safeProperties = useMemo(() => (properties ?? []).filter(Boolean), [properties]);
  const safeUnits = useMemo(() => (units ?? []).filter(Boolean), [units]);
  const safeTenants = useMemo(() => (tenants ?? []).filter(Boolean), [tenants]);
  const safeOnboarding = useMemo(() => (onboarding ?? []).filter(Boolean), [onboarding]);
  const safeLeases = useMemo(() => (leases ?? []).filter(Boolean), [leases]);
  const safePayments = useMemo(() => (payments ?? []).filter(Boolean), [payments]);
  const safeMaintenance = useMemo(() => (maintenance ?? []).filter(Boolean), [maintenance]);
  const safeContracts = useMemo(() => (contracts ?? []).filter(Boolean), [contracts]);

  // ─── Currency options for select inputs ──────────────────────────────
  const activeCurrencies = useMemo(
    () => currencyList.filter((c) => c?.status === true || c?.status === "true"),
    [currencyList],
  );
  const currencyOptions = useMemo(() => buildCurrencyOptions(activeCurrencies), [activeCurrencies]);

  // ─── Currency lookup map ──────────────────────────────────────────────
  const currencyById = useMemo(() => {
    const map = {};
    currencyList.forEach((c) => { if (c?.id) map[c.id] = c; });
    return map;
  }, [currencyList]);

  // ─── Cross-collection enrichments ────────────────────────────────────
  const availabilityRows = useMemo(
    () =>
      safeUnits.map((unit) => {
        const lease = safeLeases.find(
          (item) => item.unitId === unit.id && item.status === "active",
        );
        return { ...unit, currentLease: lease };
      }),
    [safeLeases, safeUnits],
  );

  const enrichedUnits = useMemo(
    () =>
      safeUnits.map((unit) => {
        const activeLease = safeLeases.find(
          (lease) => lease.unitId === unit.id && lease.status === "active",
        );
        const property = safeProperties.find((item) => item.id === unit.propertyId);
        const unitKind = getUnitKind(unit);
        return {
          ...unit,
          activeLease,
          property,
          displayName: unit.propertyName || unit.propertyAddress || property?.name || unit.name,
          displayAddress: unit.propertyAddress || property?.address || "-",
          unitKind,
          unitKindLabel: typeLabel[unitKind] || unitKind,
        };
      }),
    [safeLeases, safeProperties, safeUnits],
  );

  // ─── KPI buckets ─────────────────────────────────────────────────────
  const activeLeases = useMemo(
    () => safeLeases.filter((lease) => lease.status === "active"),
    [safeLeases],
  );
  const occupiedUnits = useMemo(
    () => enrichedUnits.filter((unit) => unit.status === "occupied" || unit.activeLease),
    [enrichedUnits],
  );
  const vacantUnits = useMemo(
    () => enrichedUnits.filter((unit) => ["available", "vacant"].includes(unit.status)),
    [enrichedUnits],
  );
  const maintenanceUnits = useMemo(
    () => enrichedUnits.filter((unit) => unit.status === "maintenance"),
    [enrichedUnits],
  );
  const openMaintenance = useMemo(
    () => safeMaintenance.filter((item) => ["open", "in_progress"].includes(item.status)),
    [safeMaintenance],
  );
  const urgentMaintenance = useMemo(
    () => safeMaintenance.filter((item) => ["urgent", "high"].includes(item.priority)),
    [safeMaintenance],
  );
  const inProgressMaintenance = useMemo(
    () => safeMaintenance.filter((item) => item.status === "in_progress"),
    [safeMaintenance],
  );
  const resolvedMaintenance = useMemo(
    () => safeMaintenance.filter((item) => item.status === "done"),
    [safeMaintenance],
  );
  const maintenanceCost = useMemo(
    () => safeMaintenance.reduce((sum, item) => sum + Number(item.estimatedCost || 0), 0),
    [safeMaintenance],
  );

  const monthlyRent =
    dashboard?.monthlyRent ??
    activeLeases.reduce((sum, lease) => sum + Number(lease.rentAmount || 0), 0);

  const monthlyRentByCurrency = useMemo(
    () => groupLeasesByCurrency(activeLeases, currencyById),
    [activeLeases, currencyById],
  );

  const collectedRent =
    dashboard?.collectedRent ??
    safePayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const occupancyRate = enrichedUnits.length
    ? Math.round((occupiedUnits.length / enrichedUnits.length) * 100)
    : 0;

  // ─── Payment buckets derived from lease.nextInvoiceDate ──────────────
  // The DB doesn't store payment.status — every recorded payment IS paid;
  // pending/overdue are *expected* payments computed from each active
  // lease's nextInvoiceDate and the absence of a payment for that period.
  const paymentBuckets = useMemo(() => {
    const today = moment();
    const leaseHasPaymentInPeriod = (leaseId, periodStart, periodEnd) =>
      safePayments.some(
        (p) =>
          p.leaseId === leaseId &&
          p.paymentDate &&
          moment(p.paymentDate).isBetween(periodStart, periodEnd, "day", "[]"),
      );
    const overdueLeases = activeLeases.filter((lease) => {
      if (!lease.nextInvoiceDate) return false;
      const due = moment(lease.nextInvoiceDate);
      if (!due.isBefore(today, "day")) return false;
      return !leaseHasPaymentInPeriod(lease.id, due.clone().subtract(1, "month"), due);
    });
    const upcomingLeases = activeLeases.filter((lease) => {
      if (!lease.nextInvoiceDate) return false;
      const due = moment(lease.nextInvoiceDate);
      if (due.isBefore(today, "day")) return false;
      if (due.diff(today, "days") > 5) return false;
      return !leaseHasPaymentInPeriod(lease.id, today.clone().subtract(1, "month"), due);
    });
    const currentMonthStart = today.clone().startOf("month");
    const currentMonthEnd = today.clone().endOf("month");
    const paidPaymentsThisMonth = safePayments.filter(
      (p) =>
        p.paymentDate &&
        moment(p.paymentDate).isBetween(currentMonthStart, currentMonthEnd, "day", "[]"),
    );
    const paidAmount = paidPaymentsThisMonth.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pendingAmount = upcomingLeases.reduce((sum, item) => sum + Number(item.rentAmount || 0), 0);
    const lateAmount = overdueLeases.reduce((sum, item) => sum + Number(item.rentAmount || 0), 0);

    return {
      overduePayments: overdueLeases,
      upcomingPayments: upcomingLeases,
      paidAmount,
      pendingAmount,
      lateAmount,
      plannedAmount: monthlyRent,
      paidAmountByCurrency: groupPaymentsByCurrency(paidPaymentsThisMonth),
      pendingAmountByCurrency: groupLeasesByCurrency(upcomingLeases, currencyById),
      lateAmountByCurrency: groupLeasesByCurrency(overdueLeases, currencyById),
      plannedAmountByCurrency: groupLeasesByCurrency(activeLeases, currencyById),
    };
  }, [activeLeases, safePayments, monthlyRent, currencyById]);

  return {
    // raw slice
    dashboard,
    contractTemplates,
    loading,
    accounts,
    currencyList,
    activeCurrencies,
    currencyOptions,

    // safe collections
    safeProperties,
    safeUnits,
    safeTenants,
    safeOnboarding,
    safeLeases,
    safePayments,
    safeMaintenance,
    safeContracts,

    // enrichments
    availabilityRows,
    enrichedUnits,

    // KPI buckets
    activeLeases,
    occupiedUnits,
    vacantUnits,
    maintenanceUnits,
    openMaintenance,
    urgentMaintenance,
    inProgressMaintenance,
    resolvedMaintenance,
    maintenanceCost,
    monthlyRent,
    monthlyRentByCurrency,
    collectedRent,
    occupancyRate,

    // payment buckets
    ...paymentBuckets,
  };
};
