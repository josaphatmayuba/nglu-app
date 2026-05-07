import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../../utils/functions";
import queryGenerator from "../../../../../utils/queryGenarator";

const initialState = {
  list: null,
  reviewRating: null,
  error: "",
  total: null,
  loading: false,
};

// 0. ==================== load All review-rating By Customer ========================
export const loadReviewRatingByCustomer = createAsyncThunk(
  "ReviewRating/loadReviewRatingByCustomer",
  async ({ id, arg }) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`/review-rating/product/${id}?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 1. ==================== load All review-rating ========================
export const loadAllReviewRating = createAsyncThunk(
  "ReviewRating/loadAllReviewRating",
  async (arg) => {
    try {
      const { data } = await axios.get(`/review-rating?query=all`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2. ==================== load All review-rating by paginated ========================
export const loadAllReviewRatingPaginated = createAsyncThunk(
  "ReviewRating/loadAllReviewRatingPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`review-rating?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
// 3. ==================== load single review-rating ========================
export const loadSingleReviewRating = createAsyncThunk(
  "review-rating/loadSingleReviewRating",
  async (id) => {
    try {
      const { data } = await axios.get(`review-rating/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 4. ==================== add review-rating ========================
export const addReviewRating = createAsyncThunk(
  "ReviewRating/addReviewRating",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `review-rating`,
        data: values,
      });

      return successHandler(data, "New Review-rating Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5. ==================== update review-rating ========================
export const replayReview = createAsyncThunk(
  "ReviewRating/updateReviewRating",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `/review-rating/reply`,
        data: values,
      });

      return successHandler(data, "Review-rating Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6. ==================== delete discount ========================
export const deleteReviewRating = createAsyncThunk(
  "ReviewRating/deleteReviewRating",
  async (id) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `review-rating/${id}`,
        data: {
          status: "false",
        },
      });

      return successHandler(
        data,
        "Review-rating delete Successfully"
      );
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const ReviewRatingSlice = createSlice({
  name: "review-rating",
  initialState,
  extraReducers: (builder) => {
    // 1. ==================== loadReviewRatingByCustomer ========================
    builder.addCase(loadReviewRatingByCustomer.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadReviewRatingByCustomer.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data?.getAllReviewRating;
      state.total = action.payload.data?.totalReviewRating;
    });

    builder.addCase(loadReviewRatingByCustomer.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 1. ==================== loadAllReviewRating ========================
    builder.addCase(loadAllReviewRating.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllReviewRating.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllReviewRating.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2. ==================== loadAllReviewRatingPaginated ========================
    builder.addCase(loadAllReviewRatingPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllReviewRatingPaginated.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data?.getAllReviewRating;
      state.total = action.payload.data?.totalReviewRating;
    });

    builder.addCase(loadAllReviewRatingPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3. ==================== loadSingleReviewRating ========================
    builder.addCase(loadSingleReviewRating.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleReviewRating.fulfilled, (state, action) => {
      state.loading = false;
      state.reviewRating = action.payload.data;
    });

    builder.addCase(loadSingleReviewRating.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4. ==================== addReviewRating ========================
    builder.addCase(addReviewRating.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addReviewRating.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addReviewRating.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5. ====================  updateReviewRating ========================
    builder.addCase(replayReview.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(replayReview.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(replayReview.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 6. ====================  deleteReviewRating ========================
    builder.addCase(deleteReviewRating.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteReviewRating.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteReviewRating.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default ReviewRatingSlice.reducer;
