import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";

const initialState = {
  list: [],
  error: "",
  loading: false,
};

// ==================== load all projects (registre analytique) ====================
export const loadAllProjects = createAsyncThunk(
  "project/loadAllProjects",
  async () => {
    try {
      const { data } = await axios.get(`projects`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadAllProjects.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(loadAllProjects.fulfilled, (state, action) => {
      state.loading = false;
      // L'API renvoie un tableau de projets (eventuellement enveloppe dans data).
      const payload = action.payload?.data;
      state.list = Array.isArray(payload) ? payload : payload?.getAllProject ?? [];
    });
    builder.addCase(loadAllProjects.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message ?? "";
    });
  },
});

export default projectSlice.reducer;
