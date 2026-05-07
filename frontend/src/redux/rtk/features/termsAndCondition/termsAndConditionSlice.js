import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";
import queryGenerator from "../../../../utils/queryGenarator";

const initialState = {
  list: null,
  termsAndConditions: null,
  total: null,
  error: "",
  loading: false,
  edit:false
};

// 1 ================== load termsAndConditions by paginated  ==================
export const loadAllTermsAndConditionsPaginated = createAsyncThunk(
  "termsAndConditions/loadAllTermsAndConditionsPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`terms-and-condition?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2 ================== load All TermsAndConditions =============================
export const loadAllTermsAndConditions = createAsyncThunk("terms-and-condition/loadAllTermsAndConditions", async () => {
  try {
    const { data } = await axios.get(`terms-and-condition?query=all`);

    return successHandler(data);
  } catch (error) {
    return errorHandler(error, true);
  }
});

// 3 ================== load Single TermsAndConditions ============================
export const loadSingleTermsAndConditions = createAsyncThunk(
  "TermsAndConditions/loadSingleTermsAndConditions",
  async (id) => {
    try {
      const { data } = await axios.get(`terms-and-condition/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 4 ================== Add TermsAndConditions ====================================
export const addTermsAndConditions = createAsyncThunk("TermsAndConditions/addTermsAndConditions", async (values) => {
  try {
    const { data } = await axios({
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      url: `terms-and-condition`,
      data: {
        ...values,
      },
    });

    return successHandler(data, "New TermsAndConditions Added Successfully");
  } catch (error) {
    return errorHandler(error, true);
  }
});

// 5 ================== update TermsAndConditions ================================
export const updateTermsAndConditions = createAsyncThunk(
  "TermsAndConditions/updateTermsAndConditions",
  async ({ id, values }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `terms-and-condition/${id}`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "TermsAndConditions Update Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6 ================== delete TermsAndConditions ===============================
export const deleteTermsAndConditions = createAsyncThunk("TermsAndConditions/deleteTermsAndConditions", async (id) => {
  try {
    const { data } = await axios({
      method: "patch",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      url: `terms-and-condition/${id}`,
      data: {
        status: "false",
      },
    });

    return successHandler(data, "TermsAndConditions delete Successfully");
  } catch (error) {
    return errorHandler(error, true);
  }
});

const termsAndConditionSlice = createSlice({
  name: "TermsAndConditions",
    initialState,
   reducers: {
    editTermsAndCondition: (state, action) => {
      if (action.payload) {
        state.edit = action.payload;
      } else {
        state.edit = false;
      }
    },
  },
  extraReducers: (builder) => {
    // 1 ================== get terms-and-condition by paginated ==================
    builder.addCase(loadAllTermsAndConditionsPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllTermsAndConditionsPaginated.fulfilled, (state, action) => {
        state.loading = false;
        
    });

    builder.addCase(loadAllTermsAndConditionsPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2 ================== get all terms-and-condition ==================
    builder.addCase(loadAllTermsAndConditions.pending, (state, action) => {
      state.loading = true;
    });

    builder.addCase(loadAllTermsAndConditions.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllTermsAndConditions.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3 ================== get single terms-and-condition ==================
    builder.addCase(loadSingleTermsAndConditions.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleTermsAndConditions.fulfilled, (state, action) => {
      state.loading = false;
      state.termsAndConditions = action.payload?.data
    });

    builder.addCase(loadSingleTermsAndConditions.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4 ================== add terms-and-condition ==================
    builder.addCase(addTermsAndConditions.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addTermsAndConditions.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addTermsAndConditions.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5 ================== update terms-and-condition ==================
    builder.addCase(updateTermsAndConditions.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateTermsAndConditions.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateTermsAndConditions.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 6 ================== delete terms-and-condition ==================
    builder.addCase(deleteTermsAndConditions.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteTermsAndConditions.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteTermsAndConditions.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default termsAndConditionSlice.reducer;
export const { editTermsAndCondition } = termsAndConditionSlice.actions;
