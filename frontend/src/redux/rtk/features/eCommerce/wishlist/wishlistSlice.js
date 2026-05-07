import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../../utils/functions";
import queryGenerator from "../../../../../utils/queryGenarator";

const initialState = {
  list: null,
  wishlist: null,
  error: "",
  total: null,
  loading: false,
  customerWishlist: null,
};

// 0. ==================== load All wishlist by customer id ========================
export const loadAllWishlistBYCustomer = createAsyncThunk(
  "wishlist/loadAllWishlistBYCustomer",
  async ({ id, query }) => {
    try {
      const qry = queryGenerator(query);
      const { data } = await axios.get(
        `/product-wishlist/customer/${id}?${qry}`
      );

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
// 1. ==================== load All wishlist ========================
export const loadAllWishlist = createAsyncThunk(
  "wishlist/loadAllWishlist",
  async () => {
    try {
      const { data } = await axios.get(`/product-wishlist?query=all`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

// 2. ==================== load All wishlist by paginated ========================
export const loadAllWishlistPaginated = createAsyncThunk(
  "wishlist/loadAllWishlistPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`product-wishlist?${query}`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
// 3. ==================== load single wishlist ========================
export const loadSingleWishlist = createAsyncThunk(
  "wishlist/loadSingleWishlist",
  async (id) => {
    try {
      const { data } = await axios.get(`product-wishlist/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
// 4. ==================== add wishlist ========================
export const addWishlist = createAsyncThunk(
  "wishlist/addWishlist",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `product-wishlist`,
        data: {
          ...values,
        },
      });
      return successHandler(data, "New Wishlist Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5. ==================== update wishlist ========================
export const updateWishlist = createAsyncThunk(
  "wishlist/updateWishlist",
  async ({ id, values }, { dispatch }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `product-wishlist/${id}`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "Wishlist Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6. ==================== delete wishlist ========================
export const deleteWishlist = createAsyncThunk(
  "wishlist/deleteWishlist",
  async ({ id, productId }) => {
    try {
      const { data } = await axios({
        method: "delete",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `product-wishlist/customer/${id}`,
        data: {
          productId: productId,
        },
      });

      return successHandler(data, "Wishlist Removed Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const wishListSlice = createSlice({
  name: "wishList",
  initialState,
  extraReducers: (builder) => {
    // 0. ==================== load All wishlist by customer id ========================
    builder.addCase(loadAllWishlistBYCustomer.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllWishlistBYCustomer.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data?.getAllProductWishlist;
      state.total = action.payload.data?.totalProductWishlist;
    });

    builder.addCase(loadAllWishlistBYCustomer.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 1. ==================== load All wishList ========================
    builder.addCase(loadAllWishlist.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllWishlist.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllWishlist.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2. ==================== load All wishList by paginated ========================
    builder.addCase(loadAllWishlistPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllWishlistPaginated.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data?.getAllWishList;
      state.total = action.payload.data?.totalWishList;
    });

    builder.addCase(loadAllWishlistPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3. ==================== load single wishList ========================
    builder.addCase(loadSingleWishlist.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleWishlist.fulfilled, (state, action) => {
      state.loading = false;
      state.wishList = action.payload.data;
    });

    builder.addCase(loadSingleWishlist.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4. ==================== add wishList ========================
    builder.addCase(addWishlist.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addWishlist.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addWishlist.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5. ==================== update wishList ========================
    builder.addCase(updateWishlist.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateWishlist.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateWishlist.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 6. ==================== delete wishList ========================
    builder.addCase(deleteWishlist.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteWishlist.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteWishlist.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default wishListSlice.reducer;
