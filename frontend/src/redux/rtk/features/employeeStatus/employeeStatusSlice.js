import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";
import queryGenerator from "../../../../utils/queryGenarator";

const initialState = {
  list: null,
  employeeStatus: null,
  total: null,
  error: "",
  loading: false,
};

// 1 ================== get employeeStatus by paginated  ==================
export const loadAllEmployeeStatusPaginated = createAsyncThunk(
  "employeeStatus/loadAllEmployeeStatusPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`employment-status?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2 ================== load All EmployeeStatus =============================
export const loadAllEmployeeStatus = createAsyncThunk(
  "employeeStatus/loadAllEmployeeStatus",
  async () => {
    try {
      const { data } = await axios.get(`employment-status?query=all`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 3 ================== load Single EmployeeStatus ============================
export const loadSingleEmployeeStatus = createAsyncThunk(
  "employeeStatus/loadSingleEmployeeStatus",
  async (id) => {
    try {
      const { data } = await axios.get(`employment-status/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 4 ================== Add EmployeeStatus ====================================
export const addEmployeeStatus = createAsyncThunk(
  "employeeStatus/addEmployeeStatus",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `employment-status`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "New Employment Status Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5 ================== update EmployeeStatus ================================
export const updateEmployeeStatus = createAsyncThunk(
  "employeeStatus/updateEmployeeStatus",
  async ({ id, values }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `employment-status${id}`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "Employment Status Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6 ================== delete EmployeeStatus ===============================
export const deleteEmployeeStatus = createAsyncThunk(
  "employeeStatus/deleteEmployeeStatus",
  async ({ id, status }) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `employment-status/${id}`,
        data: {
          status: status ? status : "false",
        },
      });

      return successHandler(
        data,
        `EmployeeStatus ${
          status === "true" ? "is activate" : "hided"
        } successfully`
      );
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const employeeStatusSlice = createSlice({
  name: "employeeStatus",
  initialState,
  reducers: {
    clearEmployeeStatus: (state) => {
      state.employmentStatus = null;
    },
  },
  extraReducers: (builder) => {
    // 1 ================== get EmployeeStatus by paginated ==================
    builder.addCase(loadAllEmployeeStatusPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      loadAllEmployeeStatusPaginated.fulfilled,
      (state, action) => {
        state.loading = false;
        state.list = action.payload?.data.getAllEmploymentStatus;
        state.total = action.payload?.data.totalEmploymentStatus;
      }
    );

    builder.addCase(
      loadAllEmployeeStatusPaginated.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
      }
    );

    // 2 ================== get all EmployeeStatus ==================
    builder.addCase(loadAllEmployeeStatus.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllEmployeeStatus.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllEmployeeStatus.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3 ================== get single EmployeeStatus ==================
    builder.addCase(loadSingleEmployeeStatus.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleEmployeeStatus.fulfilled, (state, action) => {
      state.loading = false;
      state.employeeStatus = action.payload?.data;
    });

    builder.addCase(loadSingleEmployeeStatus.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4 ================== add EmployeeStatus ==================
    builder.addCase(addEmployeeStatus.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addEmployeeStatus.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addEmployeeStatus.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5 ================== update EmployeeStatus ==================
    builder.addCase(updateEmployeeStatus.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateEmployeeStatus.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateEmployeeStatus.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 6 ================== delete EmployeeStatus ==================
    builder.addCase(deleteEmployeeStatus.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteEmployeeStatus.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteEmployeeStatus.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default employeeStatusSlice.reducer;
export const { clearEmployeeStatus } = employeeStatusSlice.actions;
