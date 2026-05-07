import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";

const initialState = {
  list: null,
  error: "",
  loading: false,
};

export const sendEmail = createAsyncThunk(
  "configEmail/sendEmail",
  async (values) => {
    try {
      const { data } = await axios({
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
        url: `email?emailConfigName=InventoryOs`,
        data: values,
      });

      return successHandler(data, "Email Send successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

export const loadConfigEmail = createAsyncThunk(
  "configEmail/loadConfigEmail",
  async () => {
    try {
      const { data } = await axios.get(`email-config`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

export const updateConfigEmail = createAsyncThunk(
  "configEmail/updateConfigEmail",
  async ({ id, values }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `email-config/${id}`,
        data: values,
      });

      return successHandler(data, "Email Config updated successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const emailConfigSlice = createSlice({
  name: "email-config",
  initialState,
  extraReducers: (builder) => {
    // 1. load config Email
    builder.addCase(loadConfigEmail.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(loadConfigEmail.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data;
    });
    builder.addCase(loadConfigEmail.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default emailConfigSlice.reducer;
