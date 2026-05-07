import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../../utils/functions";
import queryGenerator from "../../../../../utils/queryGenarator";

const initialState = {
  list: null,
  currency: null,
  error: "",
  loading: false,
  edit: false,
};

// 1. ==================== load All currency ========================
export const loadAllCurrency = createAsyncThunk(
  "currency/loadAllCurrency",
  async (arg) => {
    try {
      const { data } = await axios.get(`currency?query=all`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2. ==================== load All currency by paginated ========================
export const loadAllCurrencyPaginated = createAsyncThunk(
  "currency/loadAllCurrencyPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`currency?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 3. ==================== load single currency ========================
export const loadSingleCurrency = createAsyncThunk(
  "currency/loadSingleCurrency",
  async (id) => {
    try {
      const { data } = await axios.get(`currency/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 4. ==================== add currency ========================
export const addCurrency = createAsyncThunk(
  "currency/addCurrency",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `currency`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "New Currency Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5. ==================== update currency ========================
export const updateCurrency = createAsyncThunk(
  "currency/updateCurrency",
  async ({ id, values },{dispatch}) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `currency/${id}`,
        data: {
          ...values,
        },
      });
      dispatch(loadAllCurrencyPaginated({ page: 1, count: 10, status: true }))
      return successHandler(data, "Currency Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6. ==================== delete currency ========================
export const deleteCurrency = createAsyncThunk(
  "currency/deleteCurrency",
  async ({id, status}) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `currency/${id}`,
        data: {
          status: status ? status : "false",
       },
      });

      return successHandler(data, 
        `Currency ${
          status === "true" ? "is activate" : "deleted"
        } successfully`
      );
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const currencySlice = createSlice({
  name: "currency",
  initialState,
  reducers: {
    editCurrency: (state, action) => {
      if (action.payload) {
        state.edit = action.payload;
      } else {
        state.edit = false;
      }
    },
  },
  extraReducers: (builder) => {
    // 1. ==================== load All currency ========================
    builder.addCase(loadAllCurrency.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllCurrency.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllCurrency.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2. ==================== load All currency by paginated ========================
    builder.addCase(loadAllCurrencyPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllCurrencyPaginated.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data?.getAllCurrency;
      state.total = action.payload.data?.totalCurrency;
    });

    builder.addCase(loadAllCurrencyPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3. ==================== load single currency ========================
    builder.addCase(loadSingleCurrency.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleCurrency.fulfilled, (state, action) => {
      state.loading = false;
      state.currency = action.payload.data;
    });

    builder.addCase(loadSingleCurrency.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4. ==================== add currency ========================
    builder.addCase(addCurrency.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addCurrency.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addCurrency.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5. ==================== update currency ========================
    builder.addCase(updateCurrency.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateCurrency.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateCurrency.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 6. ==================== delete currency ========================
    builder.addCase(deleteCurrency.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteCurrency.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteCurrency.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default currencySlice.reducer;
export const { editCurrency } = currencySlice.actions;
