import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";
import queryGenerator from "../../../../utils/queryGenarator";

const initialState = {
  list: null,
  salaryHistory: null,
  total: null,
  error: "",
  loading: false,
};
// 1..... get salary History by paginated
export const loadAllSalaryHistoryPaginated = createAsyncThunk(
  "salary/loadAllSalaryHistoryPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`salary-history${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2.... load All salary History
export const loadAllSalaryHistory = createAsyncThunk(
  "salary/loadAllSalaryHistory",
  async () => {
    try {
      const { data } = await axios.get(`salary-history`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 3.... load Single salary History
export const loadSingleSalaryHistory = createAsyncThunk(
  "salary/loadSingleSalaryHistory",
  async (id) => {
    try {
      const { data } = await axios.get(`salary-history${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 4.... Add salary History
export const addSalaryHistory = createAsyncThunk(
  "salary/addSalaryHistory",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `salary-history`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "New Salary Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5.... update salary History
export const updateSalaryHistory = createAsyncThunk(
  "salary/updateSalaryHistory",
  async ({ id, values }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `salary-history/${id}`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "Salary Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5.... delete salary History
export const deleteSalaryHistory = createAsyncThunk(
  "salary/deleteSalaryHistory",
  async (id) => {
    try {
      const { data } = await axios({
        method: "delete",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `salary-history/${id}`,
      });

      return successHandler(data, "Salary delete Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const salaryHistorySlice = createSlice({
  name: "salaryHistory",
  initialState,
  extraReducers: (builder) => {
    // 1  get salary History by paginated
    builder.addCase(loadAllSalaryHistoryPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      loadAllSalaryHistoryPaginated.fulfilled,
      (state, action) => {
        state.loading = false;
      }
    );

    builder.addCase(loadAllSalaryHistoryPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2  get all salary History
    builder.addCase(loadAllSalaryHistory.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllSalaryHistory.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(loadAllSalaryHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3  get single salary History
    builder.addCase(loadSingleSalaryHistory.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleSalaryHistory.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(loadSingleSalaryHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4  add salary History
    builder.addCase(addSalaryHistory.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addSalaryHistory.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addSalaryHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5  update salary History
    builder.addCase(updateSalaryHistory.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateSalaryHistory.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateSalaryHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 6  delete salary History
    builder.addCase(deleteSalaryHistory.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteSalaryHistory.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteSalaryHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default salaryHistorySlice.reducer;
