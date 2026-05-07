import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";
import queryGenerator from "../../../../utils/queryGenarator";

const initialState = {
  list: null,
  error: "",
  loading: false,
  total: 0,
};

export const loadProductSearch = createAsyncThunk(
  "product/loadProductSearch",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`product?${query}`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

const productSearchSlice = createSlice({
  name: "productSearch",
  initialState,
  reducers: {
    clearProduct: (state) => {
      state.product = null;
    },
    clearProductList: (state) => {
      state.list = [];
    },
  },
  extraReducers: (builder) => {
    // 1) ====== builders for loadProduct ======

    builder.addCase(loadProductSearch.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadProductSearch.fulfilled, (state, action) => {
      state.loading = false;
      if (Array.isArray(action.payload.data)) {
        state.list = action.payload?.data;
      } else {
        state.list = action.payload?.data.getAllProduct;
        state.total = action.payload?.data.totalProduct;
      }
    });
  },
});

export default productSearchSlice.reducer;
export const { clearProduct, clearProductList } = productSearchSlice.actions;
