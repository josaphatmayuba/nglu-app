import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../../utils/functions";

const initialState = {
  list: null,
  total: null,
  error: "",
  loading: false,
  deliveryFee: null,
};

// 1. ==================== load All delivery  fee ========================
export const loadAllDeliveryFee = createAsyncThunk(
  "delivery/loadAllDeliveryFee",
  async (arg) => {
    try {
      const { data } = await axios.get(`/delivery-fee`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

// 2. ==================== addDeliveryFee ========================
export const addDeliveryFee = createAsyncThunk(
  "delivery/addDeliveryFee",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `/delivery-fee`,
        data: values,
      });

      return successHandler(data, "New delivery fee added successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 3. ==================== update delivery fee ========================
export const updateDeliveryFee = createAsyncThunk(
  "delivery/updateDeliveryFee",
  async ({ values, id }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `/delivery-fee/${id}`,
        data: values,
      });

      return successHandler(data, "Delivery Fee Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 3. ==================== delete delivery fee ========================
export const deleteDeliveryFee = createAsyncThunk(
  "delivery/deleteDeliveryFee",
  async (id) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        data: {
          status: "false",
        },
        url: `/delivery-fee/${id}`,
      });

      return successHandler(data, "Delivery Fee Delete Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const deliveryFeeSlice = createSlice({
  name: "deliveryFee",
  initialState,
  extraReducers: (builder) => {
    // 1. ==================== loadAllDeliveryFee ========================
    builder.addCase(loadAllDeliveryFee.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllDeliveryFee.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllDeliveryFee.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2. ==================== add Delivery Fee ========================
    builder.addCase(addDeliveryFee.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addDeliveryFee.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addDeliveryFee.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3. ==================== updateDeliveryFee ========================
    builder.addCase(updateDeliveryFee.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateDeliveryFee.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateDeliveryFee.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default deliveryFeeSlice.reducer;
