// Tenant-related helpers.
// Copied from PropertyManagement.jsx — keep both in sync during the soft migration.

export const tenantName = (tenant) =>
  tenant?.username ||
  [tenant?.firstName, tenant?.lastName].filter(Boolean).join(" ") ||
  tenant?.email ||
  "-";

export const tenantNameFromLease = (lease) =>
  [lease?.tenantFirstName, lease?.tenantLastName].filter(Boolean).join(" ") ||
  tenantName(lease?.tenant) ||
  "-";

export const initials = (value = "") =>
  String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

export const parseOnboardingData = (record) => {
  if (!record?.data) return {};
  try {
    return JSON.parse(record.data);
  } catch {
    return {};
  }
};
