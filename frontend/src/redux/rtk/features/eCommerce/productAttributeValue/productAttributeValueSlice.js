import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../../utils/functions";
import queryGenerator from "../../../../../utils/queryGenarator";

const initialState = {
  list: null,
  productAttributeValue: null,
  error: "",
  loading: false,
  edit:null,
};

// 1. ==================== load All productAttributeValue ========================
export const loadAllProductAttributeValue = createAsyncThunk(
  "productAttributeValue/loadAllProductAttribute",
  async () => {
    try {
      const { data } = await axios.get(`/product-attribute-value?query=all`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2. ==================== load All productAttributeValue by paginated ========================
export const loadAllProductAttributeValuePaginated = createAsyncThunk(
  "productAttributeValue/loadAllProductAttributePaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`product-attribute-value?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 3. ==================== load single productAttributeValue ========================
export const loadSingleProductAttributeValue = createAsyncThunk(
  "productAttributeValue/loadSingleProductAttribute",
  async (id) => {
    try {
      const { data } = await axios.get(`product-attribute-value/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 4. ==================== add productAttributeValue ========================
export const addProductAttributeValue = createAsyncThunk(
  "productAttributeValue/addProductAttribute",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `product-attribute-value`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "New Product Attribute Value Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5. ==================== update productAttributeValue ========================
export const updateProductAttributeValue = createAsyncThunk(
  "productAttributeValue/updateProductAttribute",
  async ({ id, values }, { dispatch }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `product-attribute-value/${id}`,
        data: {
          ...values,
        },
      });
      return successHandler(data, "Product Attribute Value Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6. ==================== delete productAttributeValue ========================
export const deleteProductAttributeValue = createAsyncThunk(
  "productAttributeValue/deleteProductAttribute",
  async (id) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `product-attribute-value/${id}`,
        data: {
          status: "false",
        },
      });

      return successHandler(data, "Product Attribute Value delete Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const productAttributeValueSlice = createSlice({
  name: "productAttributeValue",
  initialState, reducers: {
    editProductAttributeValue: (state, action) => {
      state.edit = action.payload;
    }
  },
  extraReducers: (builder) => {
    // 1. ==================== load All productAttributeValue ========================
    builder.addCase(loadAllProductAttributeValue.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllProductAttributeValue.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllProductAttributeValue.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2. ==================== load All productAttributeValue by paginated ========================
    builder.addCase(loadAllProductAttributeValuePaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllProductAttributeValuePaginated.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data?.getAllProductAttributeValue;
      state.total = action.payload.data?.totalProductAttributeValue;
    });

    builder.addCase(loadAllProductAttributeValuePaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3. ==================== load single productAttributeValue ========================
    builder.addCase(loadSingleProductAttributeValue.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleProductAttributeValue.fulfilled, (state, action) => {
      state.loading = false;
      state.discount = action.payload.data;
    });

    builder.addCase(loadSingleProductAttributeValue.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4. ==================== add productAttributeValue ========================
    builder.addCase(addProductAttributeValue.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addProductAttributeValue.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addProductAttributeValue.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5. ==================== update productAttributeValue ========================
    builder.addCase(updateProductAttributeValue.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateProductAttributeValue.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateProductAttributeValue.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 6. ==================== delete productAttributeValue ========================
    builder.addCase(deleteProductAttributeValue.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteProductAttributeValue.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteProductAttributeValue.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default productAttributeValueSlice.reducer;
export const { editProductAttributeValue} = productAttributeValueSlice.actions;