import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../../utils/functions";
import queryGenerator from "../../../../../utils/queryGenarator";

const initialState = {
  list: [],
  error: "",
  loading: false,
  total: 0,
};

export const loadProductPublicForSearch = createAsyncThunk(
  "product/loadProductPublicForSearch",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`product/public?${query}`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

const productPublicSearchSlice = createSlice({
  name: "productPublicSearchSlice",
  initialState,
  reducers: {
    clearSearchProduct: (state) => {
      state.product = null;
    },
    clearSearchProductList: (state) => {
      state.list = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadProductPublicForSearch.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadProductPublicForSearch.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data?.getAllProduct;
      state.total = action.payload?.data?.totalProduct;
    });

    builder.addCase(loadProductPublicForSearch.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default productPublicSearchSlice.reducer;
export const { clearSearchProduct, clearSearchProductList } =
  productPublicSearchSlice.actions;
