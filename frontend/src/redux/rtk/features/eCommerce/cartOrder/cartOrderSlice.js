import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../../utils/functions";
import queryGenerator from "../../../../../utils/queryGenarator";

const initialState = {
  list: null,
  total: null,
  sale: null,
  listByCourier: null,
  totalByCourier: null,
  error: "",
  loading: false,
  info: null,
  DELIVERED: null,
  RECEIVED: null,
  PENDING: null,
};

// 1. ==================== load All eCommerceSale ========================
export const loadAlleCommerceSale = createAsyncThunk(
  "sale/loadAlleCommerceSale",
  async (arg) => {
    try {
      const { data } = await axios.get(`/cart-order?`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2. ==================== load All eCommerceSale by paginated ========================
export const loadAlleCommerceSalePaginated = createAsyncThunk(
  "sale/loadAlleCommerceSalePaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`cart-order?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2. ==================== load All eCommerceSale by paginated ========================
export const loadAlleCommerceSalePaginatedForDashboard = createAsyncThunk(
  "sale/loadAlleCommerceSalePaginatedForDashboard",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`cart-order?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 3. ==================== load single eCommerceSale ========================
export const loadSingleECommerceSale = createAsyncThunk(
  "sale/loadSingleECommerceSale",
  async (id) => {
    try {
      const { data } = await axios.get(`cart-order/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
// 4. ==================== add eCommerceSale ========================
export const addECommerceSale = createAsyncThunk(
  "sale/addECommerceSale",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `cart-order`,
        data: values,
      });

      return successHandler(data, "New Sale Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5. ==================== update eCommerceSale ========================
export const addReOrderSale = createAsyncThunk(
  "sale/addReOrderSale",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `cart-order/reOrder`,
        data: values,
      });

      return successHandler(data, "ReOrder Sale Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 5. ==================== update eCommerceSale ========================
export const updateECommerceSale = createAsyncThunk(
  "sale/updateECommerceSale",
  async (values) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `cart-order/order`,
        data: values,
      });

      return successHandler(data, "Sale Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

export const loadCartOrderPaginatedByCourierMedium = createAsyncThunk(
  "cartOrder/loadCartOrderPaginatedByCourierMedium",
  async ({ id, query }) => {
    try {
      const Query = queryGenerator(query);

      const { data } = await axios.get(`courier-medium/${id}?${Query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
const cartOrderSlice = createSlice({
  name: "eCommerceSale",
  initialState,
  reducers: {
    clearOrder: (state) => {
      state.sale = null;
    },
  },
  extraReducers: (builder) => {
    // 1. ==================== load All discount ========================
    builder.addCase(loadAlleCommerceSale.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAlleCommerceSale.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAlleCommerceSale.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2. ==================== load All eCommerceSale by paginated ========================
    builder.addCase(loadAlleCommerceSalePaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      loadAlleCommerceSalePaginated.fulfilled,
      (state, action) => {
        state.loading = false;
        state.list = action.payload.data?.getAllCartOrder;
        state.total = action.payload.data?.totalCartOrder;
        state.info = action.payload.data?.aggregations;
      }
    );

    builder.addCase(loadAlleCommerceSalePaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // . 3  ==================== load All eCommerceSale by paginated for dashboard ========================
    builder.addCase(
      loadAlleCommerceSalePaginatedForDashboard.pending,
      (state) => {
        state.loading = true;
      }
    );

    builder.addCase(
      loadAlleCommerceSalePaginatedForDashboard.fulfilled,
      (state, action) => {
        state.loading = false;

        if (action.meta.arg.orderStatus === "PENDING") {
          state.PENDING = action.payload.data?.getAllCartOrder;
        } else if (action.meta.arg.orderStatus === "RECEIVED") {
          state.RECEIVED = action.payload.data?.getAllCartOrder;
        } else if (action.meta.arg.orderStatus === "DELIVERED") {
          state.DELIVERED = action.payload.data?.getAllCartOrder;
        }
      }
    );

    // 3. ==================== load single eCommerceSale ========================
    builder.addCase(loadSingleECommerceSale.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleECommerceSale.fulfilled, (state, action) => {
      state.loading = false;
      state.sale = action.payload.data;
    });

    builder.addCase(loadSingleECommerceSale.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4. ==================== add eCommerceSale ========================
    builder.addCase(addECommerceSale.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addECommerceSale.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addECommerceSale.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5. ==================== update eCommerceSale ========================
    builder.addCase(updateECommerceSale.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateECommerceSale.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateECommerceSale.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 6. ==================== addReOrderSale ========================
    builder.addCase(addReOrderSale.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addReOrderSale.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addReOrderSale.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 6. ==================== loadCartOrderPaginatedByCourierMedium ========================
    builder.addCase(loadCartOrderPaginatedByCourierMedium.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      loadCartOrderPaginatedByCourierMedium.fulfilled,
      (state, action) => {
        state.loading = false;
        state.listByCourier = action.payload?.data?.cartOrder;
        state.totalByCourier = action.payload?.data?.totalCartOrder;
      }
    );
  },
});

export default cartOrderSlice.reducer;
export const { clearOrder } = cartOrderSlice.actions;
