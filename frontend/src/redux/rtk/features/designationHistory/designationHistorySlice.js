import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";
import queryGenerator from "../../../../utils/queryGenarator";

const initialState = {
  list: null,
  designationHistory: null,
  total: null,
  error: "",
  loading: false,
};
// 1 ================== get Designation History by paginated  ==================
export const loadAllDesignationHistoryPaginated = createAsyncThunk(
  "designationHistory/loadAllSalaryHistoryPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`designation-history${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2 ================== load All Designation History  =============================
export const loadAllDesignationHistory = createAsyncThunk(
  "designationHistory/loadAllSalaryHistory",
  async () => {
    try {
      const { data } = await axios.get(`designation-history`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 3 ================== load Single Designation History ============================
export const loadSingleDesignationHistory = createAsyncThunk(
  "designationHistory/loadSingleSalaryHistory",
  async (id) => {
    try {
      const { data } = await axios.get(`designation-history${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 4 ================== Add Designation History ====================================
export const addDesignationHistory = createAsyncThunk(
  "designationHistory/addSalaryHistory",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `designation-history`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "New Designation Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5 ================== update Designation History ================================
export const updateDesignationHistory = createAsyncThunk(
  "designationHistory/updateSalaryHistory",
  async ({ id, values }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `designation-history/${id}`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "Designation Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6 ================== delete Designation History ===============================
export const deleteDesignationHistory = createAsyncThunk(
  "designationHistory/deleteSalaryHistory",
  async (id) => {
    try {
      const { data } = await axios({
        method: "delete",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `designation-history/${id}`,
      });

      return successHandler(data, "Designation delete Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const designationHistorySlice = createSlice({
  name: "designationHistory",
  initialState,
  extraReducers: (builder) => {
    // 1 ================== get Designation History by paginated ==================
    builder.addCase(loadAllDesignationHistoryPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      loadAllDesignationHistoryPaginated.fulfilled,
      (state, action) => {
        state.loading = false;
      }
    );

    builder.addCase(
      loadAllDesignationHistoryPaginated.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
      }
    );

    // 2 ================== get all Designation History ==================
    builder.addCase(loadAllDesignationHistory.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllDesignationHistory.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(loadAllDesignationHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3 ================== get single Designation History ==================
    builder.addCase(loadSingleDesignationHistory.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleDesignationHistory.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(loadSingleDesignationHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4 ================== add Designation History ==================
    builder.addCase(addDesignationHistory.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addDesignationHistory.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addDesignationHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5 ================== update Designation History ==================
    builder.addCase(updateDesignationHistory.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateDesignationHistory.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateDesignationHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 6 ================== delete Designation History ==================
    builder.addCase(deleteDesignationHistory.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteDesignationHistory.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteDesignationHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default designationHistorySlice.reducer;
