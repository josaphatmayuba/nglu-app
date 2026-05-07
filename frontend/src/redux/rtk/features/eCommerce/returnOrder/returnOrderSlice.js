import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../../utils/functions";
import queryGenerator from "../../../../../utils/queryGenarator";

const initialState = {
  list: null,
  returnOrder: null,
  error: "",
  total: null,
  loading: false,
  info: null,
  resend: null,
};

//1. ==================load All return order by paginated=====================
export const loadAllReturnOrderByPaginated = createAsyncThunk(
  "returnOrder/loadAllReturnOrderByPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`return-cart-order?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
//2. ==================load single return order =====================
export const loadSingleReturnOrder = createAsyncThunk(
  "returnOrder/loadSingleReturnOrder",
  async (id) => {
    try {
      const { data } = await axios.get(`return-cart-order/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
//3. ==================add return order =====================
export const addReturnOrder = createAsyncThunk(
  "returnOrder/ReturnOrder",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `return-cart-order`,
        data: values,
      });

      return successHandler(data, "New Return Order Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
//4. ==================update return order =====================
export const updateReturnOrder = createAsyncThunk(
  "returnOrder/updateReturnOrder",
  async ({ values, id }) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `/return-cart-order/${id}`,
        data: values,
      });

      return successHandler(data, "Return Order Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
//5. ==================resend return order =====================
export const loadAllResendReturnOrder = createAsyncThunk(
  "returnOrder/loadAllResendReturnOrder",
  async () => {
    try {
      const { data } = await axios.get("return-cart-order/resend");

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);


const ReturnOrderSlice = createSlice({
  name: "return-order",
  initialState,
  extraReducers: (builder) => {
    // 1. ========loadAllReturnOrderByPaginated===========
    builder.addCase(loadAllReturnOrderByPaginated.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      loadAllReturnOrderByPaginated.fulfilled,
      (state, action) => {
        state.loading = false;
        state.list = action.payload?.data?.getAllReturnCartOrder;
        state.total = action.payload?.data?.totalReturnCartOrder;
        state.info = action.payload?.data?.aggregations;
      }
    );
    builder.addCase(loadAllReturnOrderByPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    //2. ========loadSingleReturnOrder===========
    builder.addCase(loadSingleReturnOrder.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(loadSingleReturnOrder.fulfilled, (state, action) => {
      state.loading = false;
      state.returnOrder = action.payload.data;
    });
    builder.addCase(loadSingleReturnOrder.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

      //3. ========addReturnOrder===========
       builder.addCase(addReturnOrder.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(addReturnOrder.fulfilled, (state, action) => {
      state.loading = false;
    });
    builder.addCase(addReturnOrder.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
      //4. ========updateReturnOrder===========
       builder.addCase(updateReturnOrder.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateReturnOrder.fulfilled, (state, action) => {
      state.loading = false;
    });
    builder.addCase(updateReturnOrder.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
      //5. ========loadAllResendReturnOrder===========
       builder.addCase(loadAllResendReturnOrder.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(loadAllResendReturnOrder.fulfilled, (state, action) => {
      state.loading = false;
      state.resend = action.payload.data;
    });
    builder.addCase(loadAllResendReturnOrder.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default ReturnOrderSlice.reducer;