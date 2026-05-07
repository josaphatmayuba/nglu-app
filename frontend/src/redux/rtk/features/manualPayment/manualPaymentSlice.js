import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";
import queryGenerator from "../../../../utils/queryGenarator";

const initialState = {
  list: null,
  total: null,
  error: "",
  info:null,
  loading: false,
};

// 1 .======================= loadALLManualPayment ==========================
export const loadALLManualPayment = createAsyncThunk(
  "payment/loadALLManualPayment",
  async (arg) => {
    try {
      const { data } = await axios.get(`/manual-payment`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
// 2 .======================= loadAllManualPaymentPaginated ==========================
export const loadAllManualPaymentPaginated = createAsyncThunk(
  "payment/loadAllManualPaymentPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`manual-payment?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
// 3 .======================= loadSingleManualPayment ==========================
export const loadSingleManualPayment = createAsyncThunk(
  "payment/loadSingleManualPayment",
  async (id) => {
    try {
      const { data } = await axios.get(`manual-payment/${id}`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

// 4 .======================= AddManualPayment ==========================
export const AddManualPayment = createAsyncThunk(
  "payment/AddManualPayment",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `manual-payment`,
        data: values,
      });

      return successHandler(data, "New payment Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 5 .======================= updateManualPayment ==========================
export const updateManualPayment = createAsyncThunk(
  "payment/updateManualPayment",
  async (values) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `manual-payment`,
        data: values,
      });

      return successHandler(data, "payment Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 6 .======================= deleteManualPayment ==========================
export const deleteManualPayment = createAsyncThunk(
  "payment/deleteManualPayment",
  async (id) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `manual-payment/${id}`,
        data: {
          status: "false",
        },
      });
      return successHandler(data, `payment deleted successfully`);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 7 .======================= updatePaymentStatus ==========================
export const updatePaymentStatus = createAsyncThunk(
  "payment/updatePaymentStatus",
  async ({values, id}) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `manual-payment/verify/${id}`,
        data: values,
      });
      return successHandler(data, `payment update successfully`);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 7 .======================= payment report ==========================
  export const loadPaymentReport = createAsyncThunk(
  "payment/loadPaymentReport",
  async (arg) => {
    try {
       const query = queryGenerator(arg);
      const { data } = await axios.get(`manual-payment?${query}`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

const manualPaymentSlice = createSlice({
  name: "manualPayment",
  initialState,
  extraReducers: (builder) => {
    // 1 .======================= loadALLManualPayment ==========================
    builder.addCase(loadALLManualPayment.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadALLManualPayment.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(loadALLManualPayment.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2 .======================= loadAllManualPaymentPaginated ==========================
    builder.addCase(loadAllManualPaymentPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      loadAllManualPaymentPaginated.fulfilled,
      (state, action) => {
        state.loading = false;
        state.list = action.payload?.data?.getAllManualPayment;
        state.total = action.payload?.data?.totalManualPayment;
      }
    );

    builder.addCase(loadAllManualPaymentPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 3 .======================= loadSingleManualPayment ==========================
    builder.addCase(loadSingleManualPayment.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleManualPayment.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(loadSingleManualPayment.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4 .======================= AddManualPayment ==========================
    builder.addCase(AddManualPayment.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(AddManualPayment.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(AddManualPayment.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5 .======================= updateManualPayment ==========================
    builder.addCase(updateManualPayment.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateManualPayment.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateManualPayment.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 6 .======================= deleteManualPayment ==========================
    builder.addCase(deleteManualPayment.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteManualPayment.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteManualPayment.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 7 .======================= updatePaymentStatus ==========================
    builder.addCase(updatePaymentStatus.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updatePaymentStatus.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updatePaymentStatus.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 7 .======================= payment report ==========================
    builder.addCase(loadPaymentReport.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadPaymentReport.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data?.getAllManualPayment;
      state.info = action.payload?.data?.aggregations?._sum;
    });

    builder.addCase(loadPaymentReport.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default manualPaymentSlice.reducer;
