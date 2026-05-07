import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";
import queryGenerator from "../../../../utils/queryGenarator";

const initialState = {
  list: null,
  awardHistory: null,
  total: null,
  error: "",
  loading: false,
};

// 1 ================== get Award History by paginated  ==================
export const loadAllAwardHistoryPaginated = createAsyncThunk(
  "awardHistory/loadAllAwardHistoryPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`award-history${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2 ================== load All Award History =============================
export const loadAllAwardHistory = createAsyncThunk(
  "awardHistory/loadAllAwardHistory",
  async () => {
    try {
      const { data } = await axios.get(`award-history`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 3 ================== load Single Award History ============================
export const loadSingleAwardHistory = createAsyncThunk(
  "awardHistory/loadSingleAwardHistory",
  async (id) => {
    try {
      const { data } = await axios.get(`award-history${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 4 ================== Add Award History ====================================
export const addAwardHistory = createAsyncThunk(
  "awardHistory/addAwardHistory",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `award-history`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "New AwardHistory Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5 ================== update award History ================================
export const updateAwardHistory = createAsyncThunk(
  "awardHistory/updateAwardHistory",
  async ({ id, values }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `award-history/${id}`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "Award History Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6 ================== delete Award History ===============================
export const deleteAwardHistory = createAsyncThunk(
  "awardHistory/deleteAwardHistory",
  async (id) => {
    try {
      const { data } = await axios({
        method: "delete",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `award-history/${id}`,
      });

      return successHandler(
        data,
        "Award History delete Successfully"
      );
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const awardHistorySlice = createSlice({
  name: "awardHistory",
  initialState,
  extraReducers: (builder) => {
    // 1 ================== get Award History by paginated ==================
    builder.addCase(loadAllAwardHistoryPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllAwardHistoryPaginated.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(loadAllAwardHistoryPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2 ================== get all  Award History ==================
    builder.addCase(loadAllAwardHistory.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllAwardHistory.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(loadAllAwardHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3 ================== get single  Award History ==================
    builder.addCase(loadSingleAwardHistory.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleAwardHistory.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(loadSingleAwardHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4 ================== add Award History ==================
    builder.addCase(addAwardHistory.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addAwardHistory.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addAwardHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5 ================== update  Award History ==================
    builder.addCase(updateAwardHistory.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateAwardHistory.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateAwardHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 6 ================== delete award History ==================
    builder.addCase(deleteAwardHistory.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteAwardHistory.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteAwardHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default awardHistorySlice.reducer;
