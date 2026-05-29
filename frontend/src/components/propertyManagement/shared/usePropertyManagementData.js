// Central Redux + memo hook for the Property Management screens.
//
// usePropertyManagementData — read-only selector/memo hook consumed by every
//   sub-panel (Properties, Tenants, Leases, Payments, Maintenance).
//   Does NOT dispatch — panels call this to access already-loaded data.
//
// usePropertyManagementBootstrap — dispatches the initial API fetches.
//   Call this ONCE, in PropertyManagement.jsx, so tab-switching never
//   re-fetches data that is already in the Redux store.

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

const expectedLeaseAmount = (lease) =>
  Number(lease.remainingAmount ?? lease.expectedAmount ?? lease.rentAmount ?? lease.monthlyRent ?? 0);

const groupLeasesByCurrency = (leases, currencyById) => {
  const grouped = new Map();

  leases.forEach((lease) => {
    const currencyId = lease.currencyId ?? "default";
    const currency = currencyById.get(currencyId);
    const current = grouped.get(currencyId) || {
      currencyId,
      currencySymbol: lease.currencySymbol || (currency ? cleanCurrencySymbol(currency) : null) || "CDF",
      amount: 0,
    };

    current.amount += expectedLeaseAmount(lease);
    grouped.set(currencyId, current);
  });

  return Array.from(grouped.values());
};

const groupPaymentsByCurrency = (payments) => {
  const grouped = new Map();

  payments.forEach((payment) => {
    const currencyId = payment.currencyId ?? "default";
    const current = grouped.get(currencyId) || {
      currencyId,
      currencySymbol: payment.currencySymbol || payment.currencyName || "CDF",
      amount: 0,
    };

    current.amount += Number(payment.amount || 0);
    grouped.set(currencyId, current);
  });

  return Array.from(grouped.values());
};

const isActiveFlag = (value) =>
  value === undefined ||
  value === null ||
  value === true ||
  value === 1 ||
  value === "1" ||
  String(value).toLowerCase() === "true";

const isVisibleRecord = (record) =>
  Boolean(record) &&
  record.status !== "false" &&
  record.status !== false &&
  isActiveFlag(record.isActive);

// Bootstrap hook — call once in the top-level page component only.
export const usePropertyManagementBootstrap = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadPropertyManagement());
    dispatch(loadAllAccount());
    dispatch(loadContracts());
    dispatch(loadContractTemplates());
    dispatch(loadAllCurrency());
  }, [dispatch]);
};

export const usePropertyManagementData = () => {
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
  const rawCurrencyList = useSelector((state) => state.currency?.list);
  const currencyList = useMemo(() => rawCurrencyList || [], [rawCurrencyList]);

  // ─── Safe collections (filter out nulls coming from the API) ─────────
  const rawProperties = useMemo(() => (properties ?? []).filter(Boolean), [properties]);
  const rawUnits = useMemo(() => (units ?? []).filter(Boolean), [units]);
  const rawTenants = useMemo(() => (tenants ?? []).filter(Boolean), [tenants]);
  const rawLeases = useMemo(() => (leases ?? []).filter(Boolean), [leases]);

  const safeProperties = useMemo(() => rawProperties.filter(isVisibleRecord), [rawProperties]);
  const activePropertyIds = useMemo(
    () => new Set(safeProperties.map((property) => property.id)),
    [safeProperties],
  );
  const safeUnits = useMemo(
    () => rawUnits.filter((unit) => isVisibleRecord(unit) && activePropertyIds.has(unit.propertyId)),
    [rawUnits, activePropertyIds],
  );
  const activeUnitIds = useMemo(
    () => new Set(safeUnits.map((unit) => unit.id)),
    [safeUnits],
  );
  const safeTenants = useMemo(() => rawTenants.filter(isVisibleRecord), [rawTenants]);
  const safeLeases = useMemo(
    () =>
      rawLeases.filter(
        (lease) =>
          lease.status !== "cancelled" &&
          activePropertyIds.has(lease.propertyId) &&
          activeUnitIds.has(lease.unitId),
      ),
    [rawLeases, activePropertyIds, activeUnitIds],
  );
  const safeLeaseIds = useMemo(
    () => new Set(safeLeases.map((lease) => lease.id)),
    [safeLeases],
  );
  const visibleTenants = useMemo(() => {
    // Show all visible (non-deleted) tenants, regardless of lease status
    // This ensures counters don't change when a unit is deleted
    return safeTenants;
  }, [safeTenants]);
  const safeOnboarding = useMemo(() => (onboarding ?? []).filter(Boolean), [onboarding]);
  const safePayments = useMemo(
    () => (payments ?? []).filter((payment) => payment && safeLeaseIds.has(payment.leaseId)),
    [payments, safeLeaseIds],
  );
  const safeMaintenance = useMemo(() => (maintenance ?? []).filter(Boolean), [maintenance]);
  const safeContracts = useMemo(() => (contracts ?? []).filter(Boolean), [contracts]);

  // ─── Currency options for select inputs ──────────────────────────────
  const activeCurrencies = useMemo(
    () => currencyList.filter((c) => c?.status === true || c?.status === "true"),
    [currencyList],
  );
  const currencyOptions = useMemo(() => buildCurrencyOptions(activeCurrencies), [activeCurrencies]);
  const currencyById = useMemo(() => {
    const map = new Map();
    currencyList.forEach((currency) => {
      if (currency?.id != null) map.set(currency.id, currency);
      if (currency?.currencyId != null) map.set(currency.currencyId, currency);
    });
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
    const paidAmountForLeaseSince = (leaseId, periodStart, periodEnd) =>
      safePayments.reduce((sum, p) => {
        if (p.leaseId !== leaseId || !p.paymentDate) return sum;
        const paidAt = moment(p.paymentDate);
        if (!paidAt.isBetween(periodStart, periodEnd, "day", "[]")) return sum;
        return sum + Number(p.amount || 0);
      }, 0);
    const withRemainingAmount = (lease, paidAmount) => {
      const expectedAmount = Number(lease.rentAmount || 0);
      const remainingAmount = Math.max(expectedAmount - paidAmount, 0);
      return {
        ...lease,
        expectedAmount,
        paidAmount,
        remainingAmount,
      };
    };
    const overdueLeases = activeLeases.map((lease) => {
      if (!lease.nextInvoiceDate) return false;
      const due = moment(lease.nextInvoiceDate);
      if (!due.isBefore(today, "day")) return false;
      const paidAmount = paidAmountForLeaseSince(lease.id, due.clone().subtract(1, "month"), today);
      const leaseWithRemaining = withRemainingAmount(lease, paidAmount);
      return leaseWithRemaining.remainingAmount > 0 ? leaseWithRemaining : false;
    }).filter(Boolean);
    const upcomingLeases = activeLeases.map((lease) => {
      if (!lease.nextInvoiceDate) return false;
      const due = moment(lease.nextInvoiceDate);
      if (due.isBefore(today, "day")) return false;
      if (due.diff(today, "days") > 5) return false;
      const paidAmount = paidAmountForLeaseSince(lease.id, today.clone().subtract(1, "month"), due);
      const leaseWithRemaining = withRemainingAmount(lease, paidAmount);
      return leaseWithRemaining.remainingAmount > 0 ? leaseWithRemaining : false;
    }).filter(Boolean);
    const currentMonthStart = today.clone().startOf("month");
    const currentMonthEnd = today.clone().endOf("month");
    const paidPaymentsThisMonth = safePayments.filter(
      (p) =>
        p.paymentDate &&
        moment(p.paymentDate).isBetween(currentMonthStart, currentMonthEnd, "day", "[]"),
    );
    const paidAmount = paidPaymentsThisMonth.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pendingAmount = upcomingLeases.reduce(
      (sum, item) => sum + expectedLeaseAmount(item),
      0,
    );
    const lateAmount = overdueLeases.reduce(
      (sum, item) => sum + expectedLeaseAmount(item),
      0,
    );
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
    visibleTenants,
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
