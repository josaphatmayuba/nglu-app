import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";
import queryGenerator from "../../../../utils/queryGenarator";

const initialState = {
  list: null,
  total: null,
  error: "",
  loading: false,
};

// 1 .======================= loadALLPaymentMethod ==========================
export const loadALLPaymentMethod = createAsyncThunk(
  "payment/loadALLPaymentMethod",
  async () => {
    try {
      const { data } = await axios.get(`/payment-method?query=all`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
// 2 .======================= loadAllPaymentMethodPaginated ==========================
export const loadAllPaymentMethodPaginated = createAsyncThunk(
  "payment/loadAllPaymentMethodPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`payment-method?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
// 3 .======================= loadSinglePaymentMethod ==========================
export const loadSinglePaymentMethod = createAsyncThunk(
  "payment/loadSinglePaymentMethod",
  async (id) => {
    try {
      const { data } = await axios.get(`payment-method/${id}`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

// 4 .======================= AddPaymentMethod ==========================
export const AddPaymentMethod = createAsyncThunk(
  "payment/AddPaymentMethod",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `payment-method`,
        data: values,
      });

      return successHandler(data, "New Payment Method Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 5 .======================= updatePaymentMethod ==========================
export const updatePaymentMethod = createAsyncThunk(
  "payment/updatePaymentMethod",
  async ({ values, id }) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `payment-method/${id}`,
        data: values,
      });

      return successHandler(data, "Payment Method Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 6 .======================= deletePaymentMethod ==========================
export const deletePaymentMethod = createAsyncThunk(
  "payment/deletePaymentMethod",
  async (id) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `payment-method/${id}`,
        data: {
          status: "false",
        },
      });
      return successHandler(
        data,
        `Payment Method deleted successfully`
      );
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const paymentMethodSlice = createSlice({
  name: "paymentMethod",
  initialState,
  extraReducers: (builder) => {
    // 1 .======================= loadALLManualPayment ==========================
    builder.addCase(loadALLPaymentMethod.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadALLPaymentMethod.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data;
    });

    builder.addCase(loadALLPaymentMethod.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2 .======================= loadAllPaymentMethodPaginated ==========================
    builder.addCase(loadAllPaymentMethodPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      loadAllPaymentMethodPaginated.fulfilled,
      (state, action) => {
        state.loading = false;
        state.list = action.payload?.data?.getAllPaymentMethod;
        state.total = action.payload?.data?.totalPaymentMethod;
      }
    );

    builder.addCase(loadAllPaymentMethodPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 3 .======================= loadSinglePaymentMethod ==========================
    builder.addCase(loadSinglePaymentMethod.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSinglePaymentMethod.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(loadSinglePaymentMethod.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4 .======================= AddManualPayment ==========================
    builder.addCase(AddPaymentMethod.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(AddPaymentMethod.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(AddPaymentMethod.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5 .======================= updatePaymentMethod ==========================
    builder.addCase(updatePaymentMethod.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updatePaymentMethod.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updatePaymentMethod.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 6 .======================= deletePaymentMethod ==========================
    builder.addCase(deletePaymentMethod.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deletePaymentMethod.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deletePaymentMethod.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default paymentMethodSlice.reducer;
