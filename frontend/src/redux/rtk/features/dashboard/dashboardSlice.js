import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";

const initialState = {
  info: null,
  error: "",
  loading: false,
  // SCRUM-142: aggregated startup data (KPIs + alerts + sidenavBadge)
  startup: null,
  startupLoading: false,
  startupError: null,
  // SCRUM-142: recent activity (recentSales + cartOrders by status)
  recentActivity: null,
  recentActivityLoading: false,
};

export const loadDashboardData = createAsyncThunk(
  "dashboard/loadDashboardData",
  async ({ startDate, endDate }) => {
    try {
      const { data } = await axios.get(
        `dashboard?startDate=${startDate}&endDate=${endDate}`
      );
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

// SCRUM-142: replaces loadDashboardData + 4 Header axios calls + 1 SideNav call
export const loadDashboardStartup = createAsyncThunk(
  "dashboard/loadDashboardStartup",
  async ({ startDate, endDate }) => {
    try {
      const { data } = await axios.get(
        `dashboard/startup?startDate=${startDate}&endDate=${endDate}`
      );
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

// SCRUM-142: replaces 4 dispatches in Content.jsx (loadAllSale + 3x loadAlleCommerce)
export const loadDashboardRecentActivity = createAsyncThunk(
  "dashboard/loadDashboardRecentActivity",
  async ({ startDate, endDate }) => {
    try {
      const { data } = await axios.get(
        `dashboard/recent-activity?startDate=${startDate}&endDate=${endDate}`
      );
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboard: (state) => {
      state.info = null;
      state.startup = null;
      state.recentActivity = null;
    },
  },

  extraReducers: (builder) => {
    // loadDashboardData (kept for backward compat)
    builder.addCase(loadDashboardData.pending, (state) => { state.loading = true; });
    builder.addCase(loadDashboardData.fulfilled, (state, action) => {
      state.loading = false;
      state.info = action.payload.data;
    });
    builder.addCase(loadDashboardData.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error?.message || "Failed to load dashboard";
    });

    // loadDashboardStartup
    builder.addCase(loadDashboardStartup.pending, (state) => { state.startupLoading = true; });
    builder.addCase(loadDashboardStartup.fulfilled, (state, action) => {
      state.startupLoading = false;
      state.startup = action.payload.data;
      // Also populate state.info so existing dashboard components work unchanged
      state.info = action.payload.data;
    });
    builder.addCase(loadDashboardStartup.rejected, (state, action) => {
      state.startupLoading = false;
      state.startupError = action.error?.message || "Failed to load dashboard startup";
    });

    // loadDashboardRecentActivity
    builder.addCase(loadDashboardRecentActivity.pending, (state) => {
      state.recentActivityLoading = true;
    });
    builder.addCase(loadDashboardRecentActivity.fulfilled, (state, action) => {
      state.recentActivityLoading = false;
      state.recentActivity = action.payload.data;
    });
    builder.addCase(loadDashboardRecentActivity.rejected, (state) => {
      state.recentActivityLoading = false;
    });
  },
});

export default dashboardSlice.reducer;
export const { clearDashboard } = dashboardSlice.actions;
