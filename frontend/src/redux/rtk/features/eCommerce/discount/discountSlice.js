import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../../utils/functions";
import queryGenerator from "../../../../../utils/queryGenarator";

const initialState = {
  list: null,
  discount: null,
  error: "",
  loading: false,
};

// 1. ==================== load All discount ========================
export const loadAllDiscount = createAsyncThunk(
  "discount/loadAllDiscount",
  async (arg) => {
    try {
      const { data } = await axios.get(`/discount?query=all`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2. ==================== load All discount by paginated ========================
export const loadAllDiscountPaginated = createAsyncThunk(
  "discount/loadAllDiscountPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`discount?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 3. ==================== load single discount ========================
export const loadSingleDiscount = createAsyncThunk(
  "discount/loadSingleDiscount",
  async (id) => {
    try {
      const { data } = await axios.get(`discount/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 4. ==================== add discount ========================
export const addDiscount = createAsyncThunk(
  "discount/addDiscount",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `discount`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "New Discount Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5. ==================== update discount ========================
export const updateDiscount = createAsyncThunk(
  "discount/updateDiscount",
  async ({ id, values }, { dispatch }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `discount/${id}`,
        data: {
          ...values,
        },
      });
      dispatch(
        loadAllDiscountPaginated({
          page: 1,
          count: 10,
          status: "true",
        })
      );
      return successHandler(data, "Discount Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6. ==================== delete discount ========================
export const deleteDiscount = createAsyncThunk(
  "discount/deleteDiscount",
  async ({ id, status }) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `discount/${id}`,
        data: {
          status: status ? status : "false",
       },
      });

      console.log(data);
      

      return successHandler(data,
        `Discount ${
          status === "true" ? "is activate" : "hided"
        } successfully`
      );
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const discountSlice = createSlice({
  name: "discount",
  initialState,
  extraReducers: (builder) => {
    // 1. ==================== load All discount ========================
    builder.addCase(loadAllDiscount.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllDiscount.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllDiscount.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2. ==================== load All discount by paginated ========================
    builder.addCase(loadAllDiscountPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllDiscountPaginated.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data?.getAllDiscount;
      state.total = action.payload.data?.totalDiscount;
    });

    builder.addCase(loadAllDiscountPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3. ==================== load single discount ========================
    builder.addCase(loadSingleDiscount.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleDiscount.fulfilled, (state, action) => {
      state.loading = false;
      state.discount = action.payload.data;
    });

    builder.addCase(loadSingleDiscount.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4. ==================== add discount ========================
    builder.addCase(addDiscount.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addDiscount.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addDiscount.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5. ==================== update discount ========================
    builder.addCase(updateDiscount.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateDiscount.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateDiscount.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 6. ==================== delete discount ========================
    builder.addCase(deleteDiscount.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteDiscount.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteDiscount.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default discountSlice.reducer;
