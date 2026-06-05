export const fallback = {
  staff: [
    { id: 1, firstName: "Amina", lastName: "Kabeya", username: "amina", designation: { name: "Responsable RH" }, department: { name: "Administration" }, currentSalary: 1800, status: "true" },
    { id: 2, firstName: "Patrick", lastName: "Mbuyi", username: "patrick", designation: { name: "Chef terrain" }, department: { name: "Operations" }, currentSalary: 1450, status: "true" },
    { id: 3, firstName: "Grace", lastName: "Tshibola", username: "grace", designation: { name: "Comptable paie" }, department: { name: "Finance" }, currentSalary: 1320, status: "true" }
  ],
  designations: [{ id: 1, name: "Responsable RH" }, { id: 2, name: "Chef terrain" }, { id: 3, name: "Comptable paie" }],
  departments: [{ id: 1, name: "Administration" }, { id: 2, name: "Operations" }, { id: 3, name: "Finance" }],
  shifts: [{ id: 1, name: "Jour", startTime: "08:00:00", endTime: "17:00:00", workHour: 8 }, { id: 2, name: "Support", startTime: "10:00:00", endTime: "18:00:00", workHour: 8 }],
  awards: [{ id: 1, name: "Performance", description: "Reconnaissance mensuelle" }],
  salaries: [{ id: 1, userId: 1, salary: 1800, startDate: "2026-06-01", comment: "Paie mensuelle" }]
};
