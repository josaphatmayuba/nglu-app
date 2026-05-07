import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";
import queryGenerator from "../../../../utils/queryGenarator";

const initialState = {
  list: null,
  shift: null,
  total: null,
  error: "",
  loading: false,
};

// 1 ================== load shift by paginated  ==================
export const loadAllShiftPaginated = createAsyncThunk(
  "shift/loadAllShiftPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`shift?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2 ================== load All shift =============================
export const loadAllShift = createAsyncThunk("shift/loadAllShift", async () => {
  try {
    const { data } = await axios.get(`shift?query=all`);

    return successHandler(data);
  } catch (error) {
    return errorHandler(error, true);
  }
});

// 3 ================== load Single shift ============================
export const loadSingleShift = createAsyncThunk(
  "shift/loadSingleShift",
  async (id) => {
    try {
      const { data } = await axios.get(`shift/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 4 ================== Add shift ====================================
export const addShift = createAsyncThunk("shift/addShift", async (values) => {
  try {
    const { data } = await axios({
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      url: `shift`,
      data: {
        ...values,
      },
    });

    return successHandler(data, "New Shift Added Successfully");
  } catch (error) {
    return errorHandler(error, true);
  }
});

// 5 ================== update shift ================================
export const updateShift = createAsyncThunk(
  "shift/updateShift",
  async ({ id, values }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `shift/${id}`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "Shift Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6 ================== delete shift ===============================
export const deleteShift = createAsyncThunk(
  "shift/deleteShift",
  async ({ id, status }) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `shift/${id}`,
        data: {
          status: status ? status : "false",
        },
      });

      return successHandler(
        data,
        `Shift ${status === "true" ? "is activate" : "hided"} successfully`
      );
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const shiftSlice = createSlice({
  name: "shift",
  initialState,
  reducers: {
    clearShift: (state) => {
      state.shift = null;
    },
  },
  extraReducers: (builder) => {
    // 1 ================== get Shift by paginated ==================
    builder.addCase(loadAllShiftPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllShiftPaginated.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data?.getAllShift;
      state.total = action.payload.data?.totalShift;
    });

    builder.addCase(loadAllShiftPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2 ================== get all Shift ==================
    builder.addCase(loadAllShift.pending, (state, action) => {
      state.loading = true;
    });

    builder.addCase(loadAllShift.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllShift.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3 ================== get single Shift ==================
    builder.addCase(loadSingleShift.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleShift.fulfilled, (state, action) => {
      state.loading = false;
      state.shift = action.payload?.data;
    });

    builder.addCase(loadSingleShift.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4 ================== add Shift ==================
    builder.addCase(addShift.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addShift.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addShift.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5 ================== update Shift ==================
    builder.addCase(updateShift.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateShift.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateShift.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 6 ================== delete Shift ==================
    builder.addCase(deleteShift.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteShift.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteShift.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default shiftSlice.reducer;
export const { clearShift } = shiftSlice.actions;
