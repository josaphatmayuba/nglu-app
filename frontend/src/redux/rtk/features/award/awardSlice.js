import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";
import queryGenerator from "../../../../utils/queryGenarator";

const initialState = {
  list: null,
  award: null,
  total: null,
  error: "",
  loading: false,
};

// 1 ================== get Award by paginated  ==================
export const loadAllAwardPaginated = createAsyncThunk(
  "award/loadAllAwardPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`award${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2 ================== load All Award  =============================
export const loadAllAward = createAsyncThunk("award/loadAllAward", async () => {
  try {
    const { data } = await axios.get(`award?query=all`);

    return successHandler(data);
  } catch (error) {
    return errorHandler(error, true);
  }
});

// 3 ================== load Single Award ============================
export const loadSingleAward = createAsyncThunk(
  "award/loadSingleAward",
  async (id) => {
    try {
      const { data } = await axios.get(`award${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 4 ================== Add Award ====================================
export const addAward = createAsyncThunk("award/addAward", async (values) => {
  try {
    const { data } = await axios({
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      url: `award`,
      data: {
        ...values,
      },
    });

    return successHandler(data, "New Award Added Successfully");
  } catch (error) {
    return errorHandler(error, true);
  }
});

// 5 ================== update award ================================
export const updateAward = createAsyncThunk(
  "award/updateAward",
  async ({ id, values }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `award/${id}`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "Award Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6 ================== delete Award ===============================
export const deleteAward = createAsyncThunk("award/deleteAward", async (id) => {
  try {
    const { data } = await axios({
      method: "patch",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      url: `award/${id}`,
      data: {
        status: "false",
      },
    });

    return successHandler(data, "Award delete Successfully");
  } catch (error) {
    return errorHandler(error, true);
  }
});

const awardSlice = createSlice({
  name: "award",
  initialState,
  extraReducers: (builder) => {
    // 1 ================== get Award by paginated ==================
    builder.addCase(loadAllAwardPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllAwardPaginated.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(loadAllAwardPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2 ================== get all  Award ==================
    builder.addCase(loadAllAward.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllAward.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllAward.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3 ================== get single  Award ==================
    builder.addCase(loadSingleAward.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleAward.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(loadSingleAward.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4 ================== add Award ==================
    builder.addCase(addAward.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addAward.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addAward.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5 ================== update  Award ==================
    builder.addCase(updateAward.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateAward.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateAward.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 6 ================== delete award ==================
    builder.addCase(deleteAward.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteAward.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteAward.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default awardSlice.reducer;
