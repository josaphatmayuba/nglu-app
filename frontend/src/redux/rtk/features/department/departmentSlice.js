import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";
import queryGenerator from "../../../../utils/queryGenarator";

const initialState = {
  list: null,
  department: null,
  total: null,
  error: "",
  loading: false,
};

// 1 ================== get department by paginated  ==================
export const loadAllDepartmentPaginated = createAsyncThunk(
  "department/loadAllDepartmentPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`department?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2 ================== load All Department =============================
export const loadAllDepartment = createAsyncThunk(
  "department/loadAllDepartment",
  async () => {
    try {
      const { data } = await axios.get(`department?query=all`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 3 ================== load Single Department ============================
export const loadSingleDepartment = createAsyncThunk(
  "department/loadSingleDepartment",
  async (id) => {
    try {
      const { data } = await axios.get(`department/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 4 ================== Add Department ====================================
export const addDepartment = createAsyncThunk(
  "department/addDepartment",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `department`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "New Department Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5 ================== update Department ================================
export const updateDepartment = createAsyncThunk(
  "department/updateDepartment",
  async ({ id, values }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `department/${id}`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "Department Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6 ================== delete Department ===============================
export const deleteDepartment = createAsyncThunk(
  "department/deleteDepartment",
  async ({ id, status }) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `department/${id}`,
        data: {
          status: status ? status : "false",
        },
      });

      return successHandler(
        data,
        `Department ${
          status === "true" ? "is activate" : "hided"
        } successfully`
      );
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const departmentSlice = createSlice({
  name: "department",
  initialState,
  reducers: {
    clearDepartment: (state) => {
      state.department = null;
    },
  },
  extraReducers: (builder) => {
    // 1 ================== get Department by paginated ==================
    builder.addCase(loadAllDepartmentPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllDepartmentPaginated.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data?.getAllDepartment;
      state.total = action.payload.data?.totalDepartment;
    });

    builder.addCase(loadAllDepartmentPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2 ================== get all Department ==================
    builder.addCase(loadAllDepartment.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllDepartment.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllDepartment.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3 ================== get single Department ==================
    builder.addCase(loadSingleDepartment.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleDepartment.fulfilled, (state, action) => {
      state.loading = false;
      state.department = action.payload?.data;
    });

    builder.addCase(loadSingleDepartment.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4 ================== add Department ==================
    builder.addCase(addDepartment.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addDepartment.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addDepartment.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5 ================== update  Department ==================
    builder.addCase(updateDepartment.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateDepartment.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateDepartment.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 6 ================== delete Department ==================
    builder.addCase(deleteDepartment.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteDepartment.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteDepartment.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default departmentSlice.reducer;
export const { clearDepartment } = departmentSlice.actions;
