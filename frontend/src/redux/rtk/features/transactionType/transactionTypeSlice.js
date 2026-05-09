import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";

const initialState = {
  list: null,
  transactionType: null,
  error: "",
  loading: false,
  total: 0,
};

// LOAD_ALL_TRANSACTION_TYPE
export const loadAllTransactionType = createAsyncThunk(
  "transactionType/loadAllTransactionType",
  async () => {
    try {
      const { data } = await axios.get(`transaction-type`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// LOAD_SINGLE_TRANSACTION_TYPE
export const loadSingleTransactionType = createAsyncThunk(
  "transactionType/loadSingleTransactionType",
  async (id) => {
    try {
      const { data } = await axios.get(`transaction-type/${id}`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

// ADD_TRANSACTION_TYPE
export const addTransactionType = createAsyncThunk(
  "transactionType/addTransactionType",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `transaction-type/`,
        data: {
          ...values,
        },
      });
      return successHandler(data, "Transaction type added successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// UPDATE_TRANSACTION_TYPE
export const updateTransactionType = createAsyncThunk(
  "transactionType/updateTransactionType",
  async ({ id, values }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `transaction-type/${id}`,
        data: {
          ...values,
        },
      });
      return successHandler(data, "Transaction type updated successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// DELETE_TRANSACTION_TYPE
export const deleteTransactionType = createAsyncThunk(
  "transactionType/deleteTransactionType",
  async (id) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `transaction-type/${id}`,
      });
      return successHandler(data, "Transaction type deleted successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const transactionTypeSlice = createSlice({
  name: "transactionType",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadAllTransactionType.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadAllTransactionType.fulfilled, (state, action) => {
        state.list = action.payload.data;
        state.loading = false;
      })
      .addCase(loadAllTransactionType.rejected, (state) => {
        state.loading = false;
      })
      .addCase(loadSingleTransactionType.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadSingleTransactionType.fulfilled, (state, action) => {
        state.transactionType = action.payload.data;
        state.loading = false;
      })
      .addCase(loadSingleTransactionType.rejected, (state) => {
        state.loading = false;
      })
      .addCase(addTransactionType.pending, (state) => {
        state.loading = true;
      })
      .addCase(addTransactionType.fulfilled, (state, action) => {
        state.transactionType = action.payload.data;
        if (Array.isArray(state.list)) {
          state.list = [action.payload.data, ...state.list];
        }
        state.loading = false;
      })
      .addCase(addTransactionType.rejected, (state) => {
        state.loading = false;
      })
      .addCase(updateTransactionType.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateTransactionType.fulfilled, (state, action) => {
        state.transactionType = action.payload.data;
        if (Array.isArray(state.list)) {
          state.list = state.list.map((transactionType) =>
            transactionType.id === action.payload.data.id
              ? action.payload.data
              : transactionType
          );
        }
        state.loading = false;
      })
      .addCase(updateTransactionType.rejected, (state) => {
        state.loading = false;
      })
      .addCase(deleteTransactionType.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteTransactionType.fulfilled, (state, action) => {
        state.transactionType = null;
        if (Array.isArray(state.list)) {
          state.list = state.list.filter(
            (transactionType) => transactionType.id !== action.meta.arg
          );
        }
        state.loading = false;
      })
      .addCase(deleteTransactionType.rejected, (state) => {
        state.loading = false;
      });
  },
});

export default transactionTypeSlice.reducer;
