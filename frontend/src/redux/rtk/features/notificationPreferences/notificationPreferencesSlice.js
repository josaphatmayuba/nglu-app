import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";

export const loadNotificationPreferences = createAsyncThunk(
  "notificationPreferences/load",
  async () => {
    try {
      const { data } = await axios.get("notification-preferences");
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

export const saveNotificationPreferences = createAsyncThunk(
  "notificationPreferences/save",
  async (prefs) => {
    try {
      const { data } = await axios.put("notification-preferences", { prefs });
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

const notificationPreferencesSlice = createSlice({
  name: "notificationPreferences",
  initialState: { list: null, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadNotificationPreferences.pending, (state) => { state.loading = true; });
    builder.addCase(loadNotificationPreferences.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data ?? action.payload;
    });
    builder.addCase(loadNotificationPreferences.rejected, (state) => { state.loading = false; });

    builder.addCase(saveNotificationPreferences.pending, (state) => { state.loading = true; });
    builder.addCase(saveNotificationPreferences.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data ?? action.payload;
    });
    builder.addCase(saveNotificationPreferences.rejected, (state) => { state.loading = false; });
  },
});

export default notificationPreferencesSlice.reducer;
