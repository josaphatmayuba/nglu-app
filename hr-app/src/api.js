import { clearAuth, getToken, restoreSession } from "./auth.jsx";

const NATIVE = typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() === true || /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.HR_API_HOST) || "https://dev.ongdngolu.org";
export const API_ROOT = (NATIVE ? API_HOST : "") + "/api";

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonFetch(path, init = {}, retried = false) {
  const { base = API_ROOT, ...fetchInit } = init;
  const res = await fetch(`${base}${path}`, {
    ...fetchInit,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(fetchInit.headers || {})
    }
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      if (!retried) {
        const token = await restoreSession();
        if (token) return jsonFetch(path, init, true);
      }
      clearAuth();
      window.dispatchEvent(new CustomEvent("hr:auth-changed"));
    }
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} - ${body.slice(0, 180)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  setting: () => jsonFetch("/setting"),
  currencies: () => jsonFetch("/currency?query=all"),
  roles: () => jsonFetch("/role?query=all"),
  users: () => jsonFetch("/user?query=all"),
  overview: () => jsonFetch("/hr/staff-overview"),
  shifts: () => jsonFetch("/shift?query=all"),
  awards: () => jsonFetch("/award?query=all"),
  salaryHistory: () => jsonFetch("/salary-history?page=1&count=20"),
  leaveRequests: () => jsonFetch("/hr/leave-requests?query=all"),
  hrContracts: () => jsonFetch("/hr/contracts?query=all"),
  hrDocuments: () => jsonFetch("/hr/documents?query=all"),
  expenseRequests: () => jsonFetch("/hr/expense-requests?query=all"),
  socialDeclarations: () => jsonFetch("/hr/social-declarations?query=all"),
  performanceReviews: () => jsonFetch("/hr/performance-reviews?query=all"),
  trainingSessions: () => jsonFetch("/hr/training-sessions?query=all"),
  recruitmentOffers: () => jsonFetch("/hr/recruitment-offers?query=all"),
  createUser: (body) => jsonFetch("/user/register", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (id, body) => jsonFetch(`/user/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  closeUser: (id, body) => jsonFetch(`/user/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  createDesignation: (body) => jsonFetch("/designation", { method: "POST", body: JSON.stringify(body) }),
  createShift: (body) => jsonFetch("/shift", { method: "POST", body: JSON.stringify(body) }),
  createAward: (body) => jsonFetch("/award", { method: "POST", body: JSON.stringify(body) }),
  createDesignationHistory: (body) => jsonFetch("/designation-history", { method: "POST", body: JSON.stringify(body) }),
  createAwardHistory: (body) => jsonFetch("/award-history", { method: "POST", body: JSON.stringify(body) }),
  createSalary: (body) => jsonFetch("/salary-history", { method: "POST", body: JSON.stringify(body) }),
  createLeaveRequest: (body) => jsonFetch("/hr/leave-requests", { method: "POST", body: JSON.stringify(body) }),
  updateLeaveRequest: (id, body) => jsonFetch(`/hr/leave-requests/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  createHrContract: (body) => jsonFetch("/hr/contracts", { method: "POST", body: JSON.stringify(body) }),
  createHrDocument: (body) => jsonFetch("/hr/documents", { method: "POST", body: JSON.stringify(body) }),
  createExpenseRequest: (body) => jsonFetch("/hr/expense-requests", { method: "POST", body: JSON.stringify(body) }),
  createSocialDeclaration: (body) => jsonFetch("/hr/social-declarations", { method: "POST", body: JSON.stringify(body) }),
  createPerformanceReview: (body) => jsonFetch("/hr/performance-reviews", { method: "POST", body: JSON.stringify(body) }),
  createTrainingSession: (body) => jsonFetch("/hr/training-sessions", { method: "POST", body: JSON.stringify(body) }),
  createRecruitmentOffer: (body) => jsonFetch("/hr/recruitment-offers", { method: "POST", body: JSON.stringify(body) })
};
