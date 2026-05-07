import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";

const initialState = {
  list: null,
  error: "",
  loading: false,
};

// 1 ================== get load Permission By Id ==================
export const loadPermissionById = createAsyncThunk(
  "auth/loadPermissionById",
  async (id) => {
    try {
      const { data } = await axios.get(
        `/role-permission/permission?roleId=${id}`
      );

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  extraReducers: (builder) => {
    builder.addCase(loadPermissionById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(loadPermissionById.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data?.permissions;
      if (action.payload?.error) {
        state.error = action.payload?.error;
      }
    });
  },
});

export default authSlice.reducer;
