import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";

const initialState = {
  info: null,
  error: "",
  loading: false,
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

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboard: (state) => {
      state.info = null;
    },
  },

  extraReducers: (builder) => {
    // 1) ====== builders for loadDashboardData ======

    builder.addCase(loadDashboardData.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadDashboardData.fulfilled, (state, action) => {
      state.loading = false;
      state.info = action.payload.data;
    });
    builder.addCase(loadDashboardData.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error?.message || "Failed to load dashboard";
    });
  },
});

export default dashboardSlice.reducer;
export const { clearDashboard } = dashboardSlice.actions;
