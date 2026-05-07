import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";
import queryGenerator from "../../../../utils/queryGenarator";

const initialState = {
  list: null,
  education: null,
  total: null,
  error: "",
  loading: false,
};

// 1 ================== get Education by paginated  ==================
export const loadAllEducationPaginated = createAsyncThunk(
  "education/loadAllEducationPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`education${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2 ================== load All Education =============================
export const loadAllEducation = createAsyncThunk(
  "education/loadAllEducation",
  async () => {
    try {
      const { data } = await axios.get(`education`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 3 ================== load Single Education ============================
export const loadSingleEducation = createAsyncThunk(
  "education/loadSingleEducation",
  async (id) => {
    try {
      const { data } = await axios.get(`education${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 4 ================== Add Education ====================================
export const addEducation = createAsyncThunk(
  "education/addEducation",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `education`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "New Education Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5 ================== update Education ================================
export const updateEducation = createAsyncThunk(
  "education/updateEducation",
  async ({ id, values }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `education/${id}`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "Education Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6 ================== delete Education ===============================
export const deleteEducation = createAsyncThunk(
  "education/deleteEducation",
  async (id) => {
    try {
      const { data } = await axios({
        method: "delete",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `education/${id}`,
      });

      return successHandler(data, "Education delete Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const educationSlice = createSlice({
  name: "education",
  initialState,
  extraReducers: (builder) => {
    // 1 ================== get Education by paginated ==================
    builder.addCase(loadAllEducationPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllEducationPaginated.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(loadAllEducationPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2 ================== get all Education ==================
    builder.addCase(loadAllEducation.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllEducation.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(loadAllEducation.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3 ================== get single Education==================
    builder.addCase(loadSingleEducation.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleEducation.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(loadSingleEducation.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4 ================== add Education ==================
    builder.addCase(addEducation.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addEducation.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addEducation.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5 ================== update  Award History ==================
    builder.addCase(updateEducation.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateEducation.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateEducation.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 6 ================== delete Education ==================
    builder.addCase(deleteEducation.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteEducation.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteEducation.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default educationSlice.reducer;
