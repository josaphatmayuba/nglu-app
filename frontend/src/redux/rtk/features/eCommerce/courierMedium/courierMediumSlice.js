import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../../utils/functions";
import queryGenerator from "../../../../../utils/queryGenarator";

const initialState = {
  list: null,
  courier: null,
  error: "",
  loading: false,
};

// 1. ==================== load All courier Medium ========================
export const loadAllCourierMedium = createAsyncThunk(
  "Medium/loadAllCourierMedium",
  async (arg) => {
    try {
      const { data } = await axios.get(`courier-medium?query=all`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

// 2. ==================== load All courier Medium by paginated ========================
export const loadAllCourierMediumPaginated = createAsyncThunk(
  "Medium/loadAllCourierMediumPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`courier-medium?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 3. ==================== load single courier Medium========================
export const loadSingleCourierMedium = createAsyncThunk(
  "Medium/loadSingleCourierMedium",
  async (id) => {
    try {
      const { data } = await axios.get(`courier-medium/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
// 4. ==================== add courier Medium========================
export const addCourierMedium = createAsyncThunk(
  "Medium/addCourierMedium",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `courier-medium`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "New Courier Medium Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5. ==================== update courier Medium ========================
export const updateCourierMedium = createAsyncThunk(
  "Medium/updateCourierMedium",
  async ({ id, values }, { dispatch }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `courier-medium/${id}`,
        data: {
          ...values,
        },
      });
      dispatch(loadAllCourierMediumPaginated({ status: true, page: 1, count: 10 }));
      return successHandler(data, "Courier Medium Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6. ==================== delete courier Medium ========================
export const deleteCourierMedium = createAsyncThunk(
  "Medium/deleteCourierMedium",
  async (id) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `courier-medium/${id}`,
        data: {
          status: "false",
        },
      });

      return successHandler(data, "Courier Medium delete Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const courierMediumSlice = createSlice({
  name: "courierMedium",
  initialState,
  extraReducers: (builder) => {
    // 1. ==================== load All courier Medium ========================
    builder.addCase(loadAllCourierMedium.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllCourierMedium.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllCourierMedium.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2. ==================== load All courier Medium by paginated ========================
    builder.addCase(loadAllCourierMediumPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllCourierMediumPaginated.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data?.getAllCourierMedium;
      state.total = action.payload.data?.totalCourierMedium;
    });

    builder.addCase(loadAllCourierMediumPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3. ==================== load single courier Medium ========================
    builder.addCase(loadSingleCourierMedium.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleCourierMedium.fulfilled, (state, action) => {
      state.loading = false;
      state.courier = action.payload.data;
    });

    builder.addCase(loadSingleCourierMedium.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4. ==================== add courier Medium ========================
    builder.addCase(addCourierMedium.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addCourierMedium.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addCourierMedium.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5. ==================== update courier Medium========================
    builder.addCase(updateCourierMedium.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateCourierMedium.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateCourierMedium.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 6. ==================== delete courier Medium========================
    builder.addCase(deleteCourierMedium.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteCourierMedium.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteCourierMedium.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default courierMediumSlice.reducer;
