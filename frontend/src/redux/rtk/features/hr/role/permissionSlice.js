import { errorHandler, successHandler } from "@/utils/functions";
import queryGenerator from "@/utils/queryGenarator";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  list: null,
  permission: null,
  total: null,
  error: "",
  loading: false,
};

// 1 ================== load permission by paginated  ==================
export const loadAllPermissionPaginated = createAsyncThunk(
  "permission/loadAllPermissionPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`permission?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2 ================== load All permission =============================
export const loadAllPermission = createAsyncThunk(
  "permission/loadAllPermission",
  async () => {
    try {
      const { data } = await axios.get(`permission?query=all`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 3 ================== load Single permission ============================
export const loadSinglePermission = createAsyncThunk(
  "permission/loadSinglePermission",
  async (id) => {
    try {
      const { data } = await axios.get(`role/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 4 ================== Add permission ====================================
export const addPermission = createAsyncThunk(
  "permission/addPermission",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `role-permission`,
        data: values,
      });

      return successHandler(data, "Permission updated successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5 ================== update permission ================================
export const updatePermission = createAsyncThunk(
  "permission/updatePermission",
  async ({ id, values }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `permission/${id}`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "Permission Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6 ================== delete permission ===============================
export const deletePermission = createAsyncThunk(
  "permission/deletePermission",
  async (id) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `permission/${id}`,
        data: {
          status: "false",
        },
      });

      return successHandler(data, "Permission delete Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const permissionSlice = createSlice({
  name: "permission",
  initialState,
  reducers: {
    clearPermission: (state) => {
      state.permission = null;
    },
  },
  extraReducers: (builder) => {
    // 1 ================== get Permission by paginated ==================
    builder.addCase(loadAllPermissionPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllPermissionPaginated.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data?.getAllPermission;
      state.total = action.payload.data?.totalPermission;
    });

    builder.addCase(loadAllPermissionPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2 ================== get all Permission ==================
    builder.addCase(loadAllPermission.pending, (state, action) => {
      state.loading = true;
    });

    builder.addCase(loadAllPermission.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllPermission.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3 ================== get single Permission ==================
    builder.addCase(loadSinglePermission.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSinglePermission.fulfilled, (state, action) => {
      state.loading = false;
      state.permission = action.payload?.data;
    });

    builder.addCase(loadSinglePermission.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4 ================== add Permission ==================
    builder.addCase(addPermission.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addPermission.fulfilled, (state, action) => {
      state.loading = false;
    });

    // 5 ================== update Permission ==================
    builder.addCase(updatePermission.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updatePermission.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updatePermission.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 6 ================== delete Permission ==================
    builder.addCase(deletePermission.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deletePermission.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deletePermission.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default permissionSlice.reducer;
export const { clearPermission } = permissionSlice.actions;
