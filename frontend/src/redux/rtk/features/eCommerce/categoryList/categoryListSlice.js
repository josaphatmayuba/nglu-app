import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../../utils/functions";
import queryGenerator from "../../../../../utils/queryGenarator";

const initialState = {
  list: null,
  categoryList: null,
  error: "",
  loading: false,
};

// 1. ==================== load All categoryList ========================
export const loadAllCategoryList = createAsyncThunk(
  "categoryList/loadAllCategoryList",
  async (arg) => {
    try {
      const { data } = await axios.get(`categoryList?query="all"`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2. ==================== load All categoryList by paginated ========================
export const loadAllCategoryListPublic = createAsyncThunk(
  "categoryList/loadAllCategoryListPaginated",
  async () => {
    try {
      const { data } = await axios.get(
        `/product-category/public`
      );
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
// 3. ==================== load single categoryList ========================
export const loadSingleCategoryList = createAsyncThunk(
  "categoryList/loadSingleCategoryList",
  async (id) => {
    try {
      const { data } = await axios.get(`categoryList/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 4. ==================== add categoryList ========================
export const addCategoryList = createAsyncThunk(
  "categoryList/addCategoryList",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `categoryList`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "New CategoryList Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5. ==================== update categoryList ========================
export const updateCategoryList = createAsyncThunk(
  "categoryList/updateCategoryList",
  async ({ id, values }, { dispatch }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `categoryList/${id}`,
        data: {
          ...values,
        },
      });
      dispatch(
        loadAllCategoryListPublic()
      );
      return successHandler(data, "CategoryList Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6. ==================== delete categoryList ========================
export const deleteCategoryList = createAsyncThunk(
  "categoryList/deleteCategoryList",
  async (id) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `categoryList/${id}`,
        data: {
          status: "false",
        },
      });

      return successHandler(
        data,
        "CategoryList delete Successfully"
      );
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const categoryListSlice = createSlice({
  name: "categoryList",
  initialState,
  extraReducers: (builder) => {
    // 1. ==================== load All categoryList ========================
    builder.addCase(loadAllCategoryList.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllCategoryList.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllCategoryList.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2. ==================== load All categoryList by paginated ========================
    builder.addCase(loadAllCategoryListPublic.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllCategoryListPublic.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data;
    });

    builder.addCase(loadAllCategoryListPublic.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3. ==================== load single categoryList ========================
    builder.addCase(loadSingleCategoryList.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleCategoryList.fulfilled, (state, action) => {
      state.loading = false;
      state.categoryList = action.payload.data;
    });

    builder.addCase(loadSingleCategoryList.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4. ==================== add categoryList ========================
    builder.addCase(addCategoryList.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addCategoryList.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addCategoryList.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5. ==================== update categoryList ========================
    builder.addCase(updateCategoryList.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateCategoryList.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateCategoryList.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 6. ==================== delete categoryList ========================
    builder.addCase(deleteCategoryList.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteCategoryList.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteCategoryList.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default categoryListSlice.reducer;
