import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../../utils/functions";
import queryGenerator from "../../../../../utils/queryGenarator";

const initialState = {
  list: null,
  productAttribute: null,
  error: "",
  loading: false,
  edit: null,
};

// 1. ==================== load All productAttribute ========================
export const loadAllProductAttribute = createAsyncThunk(
  "productAttribute/loadAllProductAttribute",
  async () => {
    try {
      const { data } = await axios.get(`/product-attribute?query=all`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2. ==================== load All productAttribute by paginated ========================
export const loadAllProductAttributePaginated = createAsyncThunk(
  "productAttribute/loadAllProductAttributePaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`product-attribute?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 3. ==================== load single productAttribute ========================
export const loadSingleProductAttribute = createAsyncThunk(
  "productAttribute/loadSingleProductAttribute",
  async (id) => {
    try {
      const { data } = await axios.get(`product-attribute/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 4. ==================== add productAttribute ========================
export const addProductAttribute = createAsyncThunk(
  "productAttribute/addProductAttribute",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `product-attribute`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "New Product Attribute Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5. ==================== update productAttribute ========================
export const updateProductAttribute = createAsyncThunk(
  "productAttribute/updateProductAttribute",
  async ({ id, values }, { dispatch }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `product-attribute/${id}`,
        data: {
          ...values,
        },
      });
      return successHandler(data, "Product Attribute Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6. ==================== delete productAttribute ========================
export const deleteProductAttribute = createAsyncThunk(
  "productAttribute/deleteProductAttribute",
  async ({ id, status }) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `product-attribute/${id}`,
        data: {
          status: status ? status : "false",
        },
      });

      return successHandler(
        data,
        `Product Attribute ${
          status === "true" ? "is activate" : "hided"
        } successfully`
      );
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const productAttributeSlice = createSlice({
  name: "productAttribute",
  initialState,
  reducers: {
    editProductAttribute: (state, action) => {
      state.edit = action.payload;
    },
  },
  extraReducers: (builder) => {
    // 1. ==================== load All productAttribute ========================
    builder.addCase(loadAllProductAttribute.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllProductAttribute.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllProductAttribute.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2. ==================== load All productAttribute by paginated ========================
    builder.addCase(loadAllProductAttributePaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      loadAllProductAttributePaginated.fulfilled,
      (state, action) => {
        state.loading = false;
        state.list = action.payload.data?.getAllProductAttribute;
        state.total = action.payload.data?.totalProductAttribute;
      }
    );

    builder.addCase(
      loadAllProductAttributePaginated.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
      }
    );

    // 3. ==================== load single productAttribute ========================
    builder.addCase(loadSingleProductAttribute.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleProductAttribute.fulfilled, (state, action) => {
      state.loading = false;
      state.productAttribute = action.payload.data;
    });

    builder.addCase(loadSingleProductAttribute.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4. ==================== add productAttribute ========================
    builder.addCase(addProductAttribute.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addProductAttribute.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addProductAttribute.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5. ==================== update productAttribute ========================
    builder.addCase(updateProductAttribute.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateProductAttribute.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateProductAttribute.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 6. ==================== delete productAttribute ========================
    builder.addCase(deleteProductAttribute.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteProductAttribute.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteProductAttribute.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default productAttributeSlice.reducer;
export const { editProductAttribute } = productAttributeSlice.actions;
