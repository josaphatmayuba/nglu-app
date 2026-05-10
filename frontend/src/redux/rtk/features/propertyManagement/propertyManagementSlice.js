import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";

const initialState = {
  dashboard: null,
  properties: [],
  units: [],
  tenants: [],
  onboarding: [],
  leases: [],
  payments: [],
  maintenance: [],
  contracts: [],
  loading: false,
  error: "",
};

const request = async (method, url, data) => {
  const response = await axios({
    method,
    url,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json;charset=UTF-8",
    },
    data,
  });
  return response.data;
};

const mapPayload = (values, fieldMap) => {
  const payload = { ...(values || {}) };

  Object.entries(fieldMap).forEach(([formKey, apiKey]) => {
    if (payload[formKey] !== undefined && payload[apiKey] === undefined) {
      payload[apiKey] = payload[formKey];
    }
    delete payload[formKey];
  });

  return payload;
};

const nullifyEmpty = (payload, keys) => {
  keys.forEach((key) => {
    if (payload[key] === "") {
      payload[key] = null;
    }
  });

  return payload;
};

const propertyPayload = (values) =>
  mapPayload(values, {
    property_type: "propertyType",
    parking_spaces: "parkingSpaces",
    market_value: "marketValue",
    default_rent: "defaultRent",
  });

const unitPayload = (values) =>
  mapPayload(values, {
    property_id: "propertyId",
    unit_type: "unitType",
    monthly_rent: "monthlyRent",
    security_deposit: "securityDeposit",
  });

const leasePayload = (values) =>
  nullifyEmpty(
    mapPayload(values, {
      property_id: "propertyId",
      unit_id: "unitId",
      tenant_id: "tenantId",
      start_date: "startDate",
      end_date: "endDate",
      next_invoice_date: "nextInvoiceDate",
      billing_cycle: "billingCycle",
      rent_amount: "rentAmount",
      security_deposit: "securityDeposit",
      move_in_meter_reading: "moveInMeterReading",
      move_in_notes: "moveInNotes",
    }),
    ["endDate", "nextInvoiceDate"],
  );

const maintenancePayload = (values) =>
  nullifyEmpty(
    mapPayload(values, {
      property_id: "propertyId",
      unit_id: "unitId",
      scheduled_date: "scheduledDate",
      estimated_cost: "estimatedCost",
    }),
    ["scheduledDate"],
  );

const tenantPayload = (values) =>
  nullifyEmpty({ ...(values || {}) }, [
    "email",
    "username",
    "phone2",
    "other_monthly_income",
    "partenair_name",
    "partenair_number",
  ]);

export const loadPropertyManagement = createAsyncThunk(
  "propertyManagement/loadAll",
  async () => {
    try {
      const [dashboard, tenants, onboarding, properties, units, leases, payments, maintenance] =
        await Promise.all([
          axios.get("property-management/dashboard"),
          axios.get("property-management/tenants"),
          axios.get("property-management/onboarding"),
          axios.get("property-management/properties"),
          axios.get("property-management/units"),
          axios.get("property-management/leases"),
          axios.get("property-management/payments"),
          axios.get("property-management/maintenance"),
        ]);

      return successHandler({
        dashboard: dashboard.data,
        tenants: tenants.data,
        onboarding: onboarding.data,
        properties: properties.data,
        units: units.data,
        leases: leases.data,
        payments: payments.data,
        maintenance: maintenance.data,
      });
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const saveProperty = createAsyncThunk(
  "propertyManagement/saveProperty",
  async ({ id, values }) => {
    try {
      const data = await request(
        id ? "put" : "post",
        id ? `property-management/properties/${id}` : "property-management/properties",
        propertyPayload(values),
      );
      return successHandler(data, id ? "Property updated" : "Property created");
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const deleteProperty = createAsyncThunk(
  "propertyManagement/deleteProperty",
  async (id) => {
    try {
      const data = await request("delete", `property-management/properties/${id}`);
      return successHandler({ ...data, id }, "Property deleted");
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const saveUnit = createAsyncThunk(
  "propertyManagement/saveUnit",
  async ({ id, values }) => {
    try {
      const data = await request(
        id ? "put" : "post",
        id ? `property-management/units/${id}` : "property-management/units",
        unitPayload(values),
      );
      return successHandler(data, id ? "Unit updated" : "Unit created");
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const saveTenant = createAsyncThunk(
  "propertyManagement/saveTenant",
  async (values) => {
    try {
      const data = await request("post", "property-management/tenants", tenantPayload(values));
      return successHandler(data, "Locataire créé");
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const generateTenantOnboarding = createAsyncThunk(
  "propertyManagement/generateTenantOnboarding",
  async (values) => {
    try {
      const data = await request("post", "property-management/onboarding", values);
      return successHandler(data, "Lien d'inscription généré");
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const saveTenantOnboardingAdmin = createAsyncThunk(
  "propertyManagement/saveTenantOnboardingAdmin",
  async ({ id, values }) => {
    try {
      const data = await request("put", `property-management/onboarding/${id}`, tenantPayload(values));
      return successHandler(data, "Brouillon locataire mis à jour");
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const validateTenantOnboarding = createAsyncThunk(
  "propertyManagement/validateTenantOnboarding",
  async (id) => {
    try {
      const data = await request("post", `property-management/onboarding/${id}/validate`);
      return successHandler(data, "Dossier locataire validé");
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const deleteUnit = createAsyncThunk(
  "propertyManagement/deleteUnit",
  async (id) => {
    try {
      const data = await request("delete", `property-management/units/${id}`);
      return successHandler({ ...data, id }, "Unit deleted");
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const saveLease = createAsyncThunk(
  "propertyManagement/saveLease",
  async ({ id, values }) => {
    try {
      const data = await request(
        id ? "put" : "post",
        id ? `property-management/leases/${id}` : "property-management/leases",
        leasePayload(values),
      );
      return successHandler(data, id ? "Lease updated" : "Lease created");
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const deleteLease = createAsyncThunk(
  "propertyManagement/deleteLease",
  async (id) => {
    try {
      const data = await request("delete", `property-management/leases/${id}`);
      return successHandler({ ...data, id }, "Lease deleted");
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const createRentPayment = createAsyncThunk(
  "propertyManagement/createRentPayment",
  async (values) => {
    try {
      const data = await request("post", "property-management/payments", values);
      return successHandler(data, "Rent payment posted");
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const saveMaintenance = createAsyncThunk(
  "propertyManagement/saveMaintenance",
  async ({ id, values }) => {
    try {
      const data = await request(
        id ? "put" : "post",
        id
          ? `property-management/maintenance/${id}`
          : "property-management/maintenance",
        maintenancePayload(values),
      );
      return successHandler(
        data,
        id ? "Maintenance request updated" : "Maintenance request created",
      );
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const deleteMaintenance = createAsyncThunk(
  "propertyManagement/deleteMaintenance",
  async (id) => {
    try {
      const data = await request("delete", `property-management/maintenance/${id}`);
      return successHandler({ ...data, id }, "Maintenance request deleted");
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const loadContracts = createAsyncThunk(
  "propertyManagement/loadContracts",
  async () => {
    try {
      const { data } = await axios.get("property-management/contracts");
      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const createContract = createAsyncThunk(
  "propertyManagement/createContract",
  async (values) => {
    try {
      const data = await request("post", "property-management/contracts", values);
      return successHandler(data, "Contrat créé");
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const sendContract = createAsyncThunk(
  "propertyManagement/sendContract",
  async (id) => {
    try {
      const data = await request("post", `property-management/contracts/${id}/send`);
      return successHandler(data, "Contrat envoyé au locataire");
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const deleteContract = createAsyncThunk(
  "propertyManagement/deleteContract",
  async (id) => {
    try {
      const data = await request("delete", `property-management/contracts/${id}`);
      return successHandler({ ...data, id }, "Contrat supprimé");
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

// Public thunks (no auth header needed — use bare axios without interceptor)
export const getContractForSigning = createAsyncThunk(
  "propertyManagement/getContractForSigning",
  async (token) => {
    try {
      const { data } = await axios.get(`property-management/contracts/sign/${token}`);
      return { data };
    } catch (error) {
      return errorHandler(error, false);
    }
  },
);

export const submitSignature = createAsyncThunk(
  "propertyManagement/submitSignature",
  async ({ token, signatureData }) => {
    try {
      const { data } = await axios.post(`property-management/contracts/sign/${token}`, {
        signatureData,
      });
      return { data };
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const getTenantOnboarding = createAsyncThunk(
  "propertyManagement/getTenantOnboarding",
  async (token) => {
    try {
      const { data } = await axios.get(`tenant-onboarding?token=${encodeURIComponent(token)}`);
      return { data };
    } catch (error) {
      return errorHandler(error, false);
    }
  },
);

export const saveTenantOnboardingDraft = createAsyncThunk(
  "propertyManagement/saveTenantOnboardingDraft",
  async ({ token, values }) => {
    try {
      const { data } = await axios.post(
        `tenant-onboarding/save?token=${encodeURIComponent(token)}`,
        tenantPayload(values),
      );
      return { data };
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

export const submitTenantOnboarding = createAsyncThunk(
  "propertyManagement/submitTenantOnboarding",
  async ({ token, values }) => {
    try {
      const { data } = await axios.post(
        `tenant-onboarding/submit?token=${encodeURIComponent(token)}`,
        tenantPayload(values),
      );
      return { data };
    } catch (error) {
      return errorHandler(error, true);
    }
  },
);

const upsert = (list, item) => {
  if (!item?.id) return list;
  const existing = list.find((entry) => entry.id === item?.id);
  if (!existing) return [item, ...list];
  return list.map((entry) => (entry.id === item.id ? item : entry));
};

const propertyManagementSlice = createSlice({
  name: "propertyManagement",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadPropertyManagement.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadPropertyManagement.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload.data.dashboard;
        state.tenants = action.payload.data.tenants;
        state.onboarding = action.payload.data.onboarding;
        state.properties = action.payload.data.properties;
        state.units = action.payload.data.units;
        state.leases = action.payload.data.leases;
        state.payments = action.payload.data.payments;
        state.maintenance = action.payload.data.maintenance;
      })
      .addCase(loadPropertyManagement.rejected, (state) => {
        state.loading = false;
      })
      .addCase(saveProperty.fulfilled, (state, action) => {
        state.properties = upsert(state.properties, action.payload.data);
      })
      .addCase(deleteProperty.fulfilled, (state, action) => {
        state.properties = state.properties.filter(
          (property) => property.id !== action.payload.data.id,
        );
      })
      .addCase(saveUnit.fulfilled, (state, action) => {
        state.units = upsert(state.units, action.payload.data);
      })
      .addCase(deleteUnit.fulfilled, (state, action) => {
        state.units = state.units.filter((unit) => unit.id !== action.payload.data.id);
      })
      .addCase(saveTenant.fulfilled, (state, action) => {
        state.tenants = upsert(state.tenants, action.payload.data);
      })
      .addCase(generateTenantOnboarding.fulfilled, (state, action) => {
        state.onboarding = upsert(state.onboarding, action.payload.data);
      })
      .addCase(saveTenantOnboardingAdmin.fulfilled, (state, action) => {
        state.onboarding = upsert(state.onboarding, action.payload.data);
      })
      .addCase(validateTenantOnboarding.fulfilled, (state, action) => {
        state.onboarding = upsert(state.onboarding, action.payload.data);
        if (action.payload.data?.customer) {
          state.tenants = upsert(state.tenants, action.payload.data.customer);
        }
      })
      .addCase(saveLease.fulfilled, (state, action) => {
        state.leases = upsert(state.leases, action.payload.data);
      })
      .addCase(deleteLease.fulfilled, (state, action) => {
        state.leases = state.leases.filter((lease) => lease.id !== action.payload.data.id);
      })
      .addCase(createRentPayment.fulfilled, (state, action) => {
        state.payments = [action.payload.data, ...state.payments];
      })
      .addCase(saveMaintenance.fulfilled, (state, action) => {
        state.maintenance = upsert(state.maintenance, action.payload.data);
      })
      .addCase(deleteMaintenance.fulfilled, (state, action) => {
        state.maintenance = state.maintenance.filter(
          (request) => request.id !== action.payload.data.id,
        );
      })
      .addCase(loadContracts.fulfilled, (state, action) => {
        state.contracts = (action.payload.data ?? []).filter(Boolean);
      })
      .addCase(createContract.fulfilled, (state, action) => {
        if (action.payload.data) state.contracts = [action.payload.data, ...state.contracts];
      })
      .addCase(sendContract.fulfilled, (state, action) => {
        if (action.payload.data?.id) {
          state.contracts = state.contracts.map((c) =>
            c?.id === action.payload.data.id ? { ...c, status: "sent" } : c,
          );
        }
      })
      .addCase(deleteContract.fulfilled, (state, action) => {
        state.contracts = state.contracts.filter(
          (c) => c?.id !== action.payload.data?.id,
        );
      });
  },
});

export default propertyManagementSlice.reducer;
