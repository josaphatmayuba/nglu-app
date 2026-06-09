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
  attendances: () => jsonFetch("/hr/attendances?query=all"),
  attendanceSummary: () => jsonFetch("/hr/attendances/summary"),
  salaryHistory: () => jsonFetch("/salary-history?page=1&count=20"),
  payrolls: () => jsonFetch("/hr/payrolls?query=all"),
  payrollHtml: async (id) => {
    const res = await fetch(`${API_ROOT}/hr/payrolls/${id}/html`, { headers: { ...authHeaders() } });
    if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);
    return res.text();
  },
  // Téléchargement authentifié (un <a href> ne porte pas le JWT -> 401).
  downloadAuth: async (path, filename) => {
    const res = await fetch(`${API_ROOT}${path}`, { headers: { ...authHeaders() } });
    if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  },
  payrollSummary: (period) => jsonFetch(`/hr/payrolls/summary${period ? `?period=${period}` : ""}`),
  generatePayroll: (userId, period) => jsonFetch(`/hr/payrolls/generate?userId=${userId}${period ? `&period=${period}` : ""}`),
  hrProjects: () => jsonFetch("/hr/projects?query=all"),
  hrProjectReport: () => jsonFetch("/hr/projects/report"),
  hrProjectAssignments: () => jsonFetch("/hr/project-assignments?query=all"),
  leaveRequests: () => jsonFetch("/hr/leave-requests?query=all"),
  leaveSummary: () => jsonFetch("/hr/leave-requests/summary"),
  hrContracts: () => jsonFetch("/hr/contracts?query=all"),
  hrDocuments: () => jsonFetch("/hr/documents?query=all"),
  expenseRequests: () => jsonFetch("/hr/expense-requests?query=all"),
  socialDeclarations: () => jsonFetch("/hr/social-declarations?query=all"),
  performanceReviews: () => jsonFetch("/hr/performance-reviews?query=all"),
  trainingSessions: () => jsonFetch("/hr/training-sessions?query=all"),
  timesheets: () => jsonFetch("/hr/timesheets?query=all"),
  employeeRequests: () => jsonFetch("/hr/employee-requests?query=all"),
  recruitmentOffers: () => jsonFetch("/hr/recruitment-offers?query=all"),
  createUser: (body) => jsonFetch("/user/register", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (id, body) => jsonFetch(`/user/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  closeUser: (id, body) => jsonFetch(`/user/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  createDesignation: (body) => jsonFetch("/designation", { method: "POST", body: JSON.stringify(body) }),
  createShift: (body) => jsonFetch("/shift", { method: "POST", body: JSON.stringify(body) }),
  createAward: (body) => jsonFetch("/award", { method: "POST", body: JSON.stringify(body) }),
  createAttendance: (body) => jsonFetch("/hr/attendances", { method: "POST", body: JSON.stringify(body) }),
  createDesignationHistory: (body) => jsonFetch("/designation-history", { method: "POST", body: JSON.stringify(body) }),
  createAwardHistory: (body) => jsonFetch("/award-history", { method: "POST", body: JSON.stringify(body) }),
  createSalary: (body) => jsonFetch("/salary-history", { method: "POST", body: JSON.stringify(body) }),
  createPayroll: (body) => jsonFetch("/hr/payrolls", { method: "POST", body: JSON.stringify(body) }),
  updatePayroll: (id, body) => jsonFetch(`/hr/payrolls/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  createHrProject: (body) => jsonFetch("/hr/projects", { method: "POST", body: JSON.stringify(body) }),
  createHrProjectAssignment: (body) => jsonFetch("/hr/project-assignments", { method: "POST", body: JSON.stringify(body) }),
  createLeaveRequest: (body) => jsonFetch("/hr/leave-requests", { method: "POST", body: JSON.stringify(body) }),
  updateLeaveRequest: (id, body) => jsonFetch(`/hr/leave-requests/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  createHrContract: (body) => jsonFetch("/hr/contracts", { method: "POST", body: JSON.stringify(body) }),
  hrDocumentSummary: () => jsonFetch("/hr/documents/summary"),
  generateHrDocument: (body) => jsonFetch("/hr/documents/generate", { method: "POST", body: JSON.stringify(body) }),
  submitHrDocument: (id) => jsonFetch(`/hr/documents/${id}/submit`, { method: "POST", body: JSON.stringify({}) }),
  approveHrDocument: (id, comment) => jsonFetch(`/hr/documents/${id}/approve`, { method: "POST", body: JSON.stringify({ comment }) }),
  rejectHrDocument: (id, comment) => jsonFetch(`/hr/documents/${id}/reject`, { method: "POST", body: JSON.stringify({ comment }) }),
  signHrDocument: (id, signedBy) => jsonFetch(`/hr/documents/${id}/sign`, { method: "POST", body: JSON.stringify({ signedBy }) }),
  createHrDocument: (body) => jsonFetch("/hr/documents", { method: "POST", body: JSON.stringify(body) }),
  createExpenseRequest: (body) => jsonFetch("/hr/expense-requests", { method: "POST", body: JSON.stringify(body) }),
  createSocialDeclaration: (body) => jsonFetch("/hr/social-declarations", { method: "POST", body: JSON.stringify(body) }),
  createPerformanceReview: (body) => jsonFetch("/hr/performance-reviews", { method: "POST", body: JSON.stringify(body) }),
  createTrainingSession: (body) => jsonFetch("/hr/training-sessions", { method: "POST", body: JSON.stringify(body) }),
  createTimesheet: (body) => jsonFetch("/hr/timesheets", { method: "POST", body: JSON.stringify(body) }),
  createEmployeeRequest: (body) => jsonFetch("/hr/employee-requests", { method: "POST", body: JSON.stringify(body) }),
  updateEmployeeRequest: (id, body) => jsonFetch(`/hr/employee-requests/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  createRecruitmentOffer: (body) => jsonFetch("/hr/recruitment-offers", { method: "POST", body: JSON.stringify(body) }),
  hrCandidates: () => jsonFetch("/hr/candidates?query=all"),
  candidateSummary: () => jsonFetch("/hr/candidates/summary"),
  createCandidate: (body) => jsonFetch("/hr/candidates", { method: "POST", body: JSON.stringify(body) }),
  updateCandidate: (id, body) => jsonFetch(`/hr/candidates/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  convertCandidate: (id, body) => jsonFetch(`/hr/candidates/${id}/convert`, { method: "POST", body: JSON.stringify(body) }),
  deleteCandidate: (id) => jsonFetch(`/hr/candidates/${id}`, { method: "DELETE" }),
  submitPayroll: (id, body = {}) => jsonFetch(`/hr/payrolls/${id}/submit`, { method: "POST", body: JSON.stringify(body) }),
  approvePayroll: (id, body = {}) => jsonFetch(`/hr/payrolls/${id}/approve`, { method: "POST", body: JSON.stringify(body) }),
  rejectPayroll: (id, body = {}) => jsonFetch(`/hr/payrolls/${id}/reject`, { method: "POST", body: JSON.stringify(body) }),
  payPayroll: (id, body = {}) => jsonFetch(`/hr/payrolls/${id}/pay`, { method: "POST", body: JSON.stringify(body) }),
  aiContext: () => jsonFetch("/hr/ai/context"),
  uploadEmployeePhoto: (userId, file) => {
    const form = new FormData(); form.append("photo", file);
    return jsonFetch(`/hr/employees/${userId}/photo`, { method: "POST", body: form, headers: {} });
  },
  listPersonalDocuments: (userId) => jsonFetch(`/hr/employees/${userId}/personal-documents`),
  uploadPersonalDocument: (userId, file, documentType, notes, uploadedBy) => {
    const form = new FormData();
    form.append("file", file);
    form.append("documentType", documentType);
    if (notes) form.append("notes", notes);
    if (uploadedBy) form.append("uploadedBy", String(uploadedBy));
    return jsonFetch(`/hr/employees/${userId}/personal-documents`, { method: "POST", body: form, headers: {} });
  },
  deletePersonalDocument: (docId) => jsonFetch(`/hr/employees/personal-documents/${docId}`, { method: "DELETE" }),
  taxRules: () => jsonFetch("/hr/tax-rules"),
  createTaxRule: (body) => jsonFetch("/hr/tax-rules", { method: "POST", body: JSON.stringify(body) }),
  updateTaxRule: (id, body) => jsonFetch(`/hr/tax-rules/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTaxRule: (id) => jsonFetch(`/hr/tax-rules/${id}`, { method: "DELETE" }),
};
