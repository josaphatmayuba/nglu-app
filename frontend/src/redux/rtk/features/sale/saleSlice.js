import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";
import queryGenerator from "../../../../utils/queryGenarator";

const initialState = {
  list: null,
  sale: null,
  total: null,
  totalPage: null,
  error: "",
  loading: false,
  info: null,
};

export const addSale = createAsyncThunk("sale/addSale", async (values) => {
  try {
    const { data } = await axios({
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      url: `sale-invoice/`,
      data: {
        ...values,
      },
    });

    const respData = {
      ...data.createdInvoice,
      customer: data.customer,
    };

    return successHandler(respData, "New product sold");
  } catch (error) {
    return errorHandler(error, true);
  }
});

export const addEcomOrder = createAsyncThunk(
  "sale/addEcomOrder",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `e-commerce/orders/create-order`,
        data: {
          ...values,
        },
      });

      const respData = {
        newData: {
          ...data.createdInvoice,
          customer: data.customer,
        },
        createdInvoiceId: data.createdInvoice.id,
        message: "success",
      };

      return respData;
    } catch (error) {
      return {
        message: "error",
      };
    }
  }
);

export const deleteSale = createAsyncThunk("sale/deleteSale", async (id) => {
  try {
    const { data } = await axios({
      method: "patch",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      url: `sale-invoice/${id}`,
      data: {
        status: "false",
      },
    });

    return successHandler(data, "Sale deleted");
  } catch (error) {
    return errorHandler(error, true);
  }
});

export const loadSingleSale = createAsyncThunk(
  "sale/loadSingleSale",
  async (id) => {
    try {
      const { data } = await axios.get(`sale-invoice/${id}`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

export const loadSingleSaleForCustomer = createAsyncThunk(
  "sale/loadSingleSaleForCustomer",
  async (id) => {
    try {
      const { data } = await axios.get(`sale-invoice/customer/${id}`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

export const loadAllSale = createAsyncThunk("sale/loadAllSale", async (arg) => {
  try {
    const query = queryGenerator(arg);
    const { data } = await axios.get(`sale-invoice?${query}`);

    return successHandler(data);
  } catch (error) {
    return errorHandler(error);
  }
});

export const loadAllOrderPaginated = createAsyncThunk(
  "sale/loadAllOrderPaginated",
  async (query) => {
    try {
      const Query = queryGenerator(query);
      const { data } = await axios.get(`sale-invoice/customer?${Query}`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

export const sendSaleInvoice = createAsyncThunk(
  "sale/sendSaleInvoice",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `email-invoice?type=saleinvoice`,
        data: values,
      });

      const respData = {
        ...data.createdInvoice,
        customer: data.customer,
      };

      return successHandler(respData, "Send Invoice Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

export const loadAllSaleReport = createAsyncThunk(
  "sale/loadAllSaleReport",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`sale-invoice?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

const saleSlice = createSlice({
  name: "sale",
  initialState,
  reducers: {
    clearSale: (state) => {
      state.sale = null;
    },
  },
  extraReducers: (builder) => {
    // 1) ====== builders for loadAllSale ======

    builder.addCase(loadAllSale.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllSale.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data?.getAllSaleInvoice;
      state.total = action.payload?.data?.aggregations;
      state.totalPage = action.payload?.data?.totalSaleInvoice;
    });

    builder.addCase(loadAllSale.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2) ====== builders for ecomorders ======

    builder.addCase(loadAllOrderPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllOrderPaginated.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data?.getAllSaleInvoice;
      state.total = action.payload?.data?.totalSaleInvoice;
    });

    builder.addCase(loadAllOrderPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2) ====== builders for addSale ======

    builder.addCase(addSale.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addSale.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addSale.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    //  ====== builders for addEcomOrder ======

    builder.addCase(addEcomOrder.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addEcomOrder.fulfilled, (state, action) => {
      state.loading = false;

      if (!Array.isArray(state.list)) {
        state.list = [];
      }
      const list = [...state.list];
      list.push(action.payload.newData);
      state.list = list;
    });

    builder.addCase(addEcomOrder.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3) ====== builders for loadSingleSale ======

    builder.addCase(loadSingleSale.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleSale.fulfilled, (state, action) => {
      state.loading = false;
      state.sale = action.payload?.data;
    });

    builder.addCase(loadSingleSale.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3) ====== builders for loadSingleSale ======

    builder.addCase(loadSingleSaleForCustomer.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleSaleForCustomer.fulfilled, (state, action) => {
      state.loading = false;
      state.sale = action.payload?.data;
    });

    builder.addCase(loadSingleSaleForCustomer.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4) ====== builders for deleteSale ======

    builder.addCase(deleteSale.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteSale.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteSale.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 4) ====== builders for sale Report ======

    builder.addCase(loadAllSaleReport.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllSaleReport.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data?.getAllSaleInvoice;
      state.info = action.payload.data?.aggregations?._sum;
    });

    builder.addCase(loadAllSaleReport.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default saleSlice.reducer;
export const { clearSale } = saleSlice.actions;
