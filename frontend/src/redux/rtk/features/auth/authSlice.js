import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";

const initialState = {
  list: null,
  error: "",
  loading: false,
  attempted: false,
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
      // Marque la tentative comme effectuee : evite que l'effect de garde
      // (qui dispatch tant que `list` est falsy) reboucle a l'infini quand
      // la reponse ne contient pas de permissions (liste vide / erreur).
      state.attempted = true;
      state.list = action.payload?.data?.permissions ?? [];
      if (action.payload?.error) {
        state.error = action.payload?.error;
      }
    });
    builder.addCase(loadPermissionById.rejected, (state, action) => {
      state.loading = false;
      state.attempted = true;
      state.error = action.error?.message || "Erreur de chargement des permissions";
    });
  },
});

export default authSlice.reducer;
