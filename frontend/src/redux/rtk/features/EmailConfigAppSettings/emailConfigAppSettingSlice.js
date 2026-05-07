import { errorHandler, successHandler } from "@/utils/functions";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  list: null,
  emailConfig: null,
  total: null,
  error: "",
  loading: false,
};

export const loadAllEmailConfig = createAsyncThunk(
  "emailConfig/loadAllEmailConfig",
  async () => {
    try {
      const { data } = await axios.get(`email-config`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

export const loadSingleEmailConfig = createAsyncThunk(
  "emailConfig/loadSingleEmailConfig",
  async (id) => {
    try {
      const { data } = await axios.get(`emailConfig/${id}`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

export const updateEmailConfig = createAsyncThunk(
  "emailConfig/updateEmailConfig",
  async (values) => {
    try {
      const { data } = await axios({
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `email-config`,
        data: values,
      });
      return successHandler(data, "Email Config Updated Successfully");
    } catch (error) {
      return errorHandler(error);
    }
  }
);

const emailConfigAppSettingSlice = createSlice({
  name: "emailConfig",
  initialState,
  reducers: {
    clearEmailConfig: (state) => {
      state.emailConfig = null;
    },
    clearEmailConfigList: (state) => {
      state.list = [];
    },
  },
  extraReducers: (builder) => {
    // 1) ====== builders for loadAllEmailConfigPaginated ======
    builder.addCase(loadAllEmailConfig.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllEmailConfig.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data;
    });

    // 3) ====== builders for loadSingleEmailConfig ======
    builder.addCase(loadSingleEmailConfig.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleEmailConfig.fulfilled, (state, action) => {
      state.loading = false;
      state.emailConfig = action?.payload?.data;
    });
    // 4) ====== builders for updateEmailConfig ======
    builder.addCase(updateEmailConfig.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateEmailConfig.fulfilled, (state) => {
      state.loading = false;
    });
  },
});

export default emailConfigAppSettingSlice.reducer;
export const { clearEmailConfig, clearEmailConfigList } =
  emailConfigAppSettingSlice.actions;
