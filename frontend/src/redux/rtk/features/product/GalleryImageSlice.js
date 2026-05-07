import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";

const initialState = {
  list: null,
  error: "",
  loading: false,
  total: 0,
};

export const deleteImage = createAsyncThunk(
  "product/deleteImage",
  async ({ query, id }) => {
    try {
      const { data } = await axios.patch(`product/${id}?${query}`);
      return successHandler(data, "Product image deleted successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
export const updateImage = createAsyncThunk(
  "product/updateImage",
  async ({ values, id }) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `product/${id}?query=update-image`,
        data: values,
      });
      return successHandler(data, "Product image updated successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const GalleryImageSlice = createSlice({
  name: "GalleryImageSlice",
  initialState,
  reducers: {},
  extraReducers: (builder) => {},
});

export default GalleryImageSlice.reducer;
export const { clearProduct, clearProductList } = GalleryImageSlice.actions;
