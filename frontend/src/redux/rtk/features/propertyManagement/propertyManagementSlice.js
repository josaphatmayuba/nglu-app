import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";

const initialState = {
  dashboard: null,
  properties: [],
  units: [],
  tenants: [],
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

export const loadPropertyManagement = createAsyncThunk(
  "propertyManagement/loadAll",
  async () => {
    try {
      const [dashboard, tenants, properties, units, leases, payments, maintenance] =
        await Promise.all([
          axios.get("property-management/dashboard"),
          axios.get("property-management/tenants"),
          axios.get("property-management/properties"),
          axios.get("property-management/units"),
          axios.get("property-management/leases"),
          axios.get("property-management/payments"),
          axios.get("property-management/maintenance"),
        ]);

      return successHandler({
        dashboard: dashboard.data,
        tenants: tenants.data,
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
        values,
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
        values,
      );
      return successHandler(data, id ? "Unit updated" : "Unit created");
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
        values,
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
        values,
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

const upsert = (list, item) => {
  const existing = list.find((entry) => entry.id === item.id);
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
        state.contracts = action.payload.data ?? [];
      })
      .addCase(createContract.fulfilled, (state, action) => {
        if (action.payload.data) state.contracts = [action.payload.data, ...state.contracts];
      })
      .addCase(sendContract.fulfilled, (state, action) => {
        if (action.payload.data?.id) {
          state.contracts = state.contracts.map((c) =>
            c.id === action.payload.data.id ? { ...c, status: "sent" } : c,
          );
        }
      })
      .addCase(deleteContract.fulfilled, (state, action) => {
        state.contracts = state.contracts.filter((c) => c.id !== action.payload.data.id);
      });
  },
});

export default propertyManagementSlice.reducer;
