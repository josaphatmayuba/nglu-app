import { errorHandler, successHandler } from "@/utils/functions";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  list: null,
  quickLink: null,
  total: null,
  error: "",
  loading: false,
};

export const loadAllQuickLink = createAsyncThunk(
  "quickLink/loadAllQuickLink",
  async () => {
    try {
      const { data } = await axios.get(`/quick-link?query=all`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
export const loadAllQuickLinkPosition = createAsyncThunk(
  "quickLink/loadAllQuickLinkPosition",
  async () => {
    try {
      const { data } = await axios.get(`/quick-link/position`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

export const updateQuickLink = createAsyncThunk(
  "quickLink/updateQuickLink",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `quick-link/update`,
        data: values,
      });
      return successHandler(data, "Quote Update Success");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const quickLinkSlice = createSlice({
  name: "quickLink",
  initialState,
  reducers: {
    clearQuickLink: (state) => {
      state.quote = null;
    },
  },

  extraReducers: (builder) => {
    builder.addCase(loadAllQuickLink.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllQuickLink.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data;
    });
    builder.addCase(loadAllQuickLinkPosition.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllQuickLinkPosition.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data;
    });

    builder.addCase(updateQuickLink.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateQuickLink.fulfilled, (state) => {
      state.loading = false;
    });
  },
});

export const { clearQuickLink } = quickLinkSlice.actions;
export default quickLinkSlice.reducer;
