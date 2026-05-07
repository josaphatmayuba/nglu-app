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

export const loadProductPublicForRelated = createAsyncThunk(
  "product/loadProductPublic",
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

const productPublicRelatedSlice = createSlice({
  name: "productPublicRelatedSlice",
  initialState,
  reducers: {
    clearRelatedProduct: (state) => {
      state.product = null;
    },
    clearRelatedProductList: (state) => {
      state.list = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadProductPublicForRelated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadProductPublicForRelated.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data?.getAllProduct;
      state.total = action.payload?.data?.totalProduct;
    });

    builder.addCase(loadProductPublicForRelated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default productPublicRelatedSlice.reducer;
export const { clearRelatedProduct, clearRelatedProductList } =
  productPublicRelatedSlice.actions;
