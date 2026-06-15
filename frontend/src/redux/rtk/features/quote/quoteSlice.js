import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";
import queryGenerator from "../../../../utils/queryGenarator";

const initialState = {
  list: null,
  quote: null,
  total: null,
  totalPage: null,
  error: "",
  loading: false,
};

export const loadAllQuote = createAsyncThunk(
  "quote/loadAllQuote",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`quote?${query}`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

export const loadSingleQuote = createAsyncThunk(
  "quote/loadSingleQuote",
  async (id) => {
    try {
      const { data } = await axios.get(`quote/${id}`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

export const addQuote = createAsyncThunk("quote/addQuote", async (values) => {
  try {
    const { data } = await axios({
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      url: `quote`,
      data: { ...values },
    });

    return successHandler(data, "Devis créé");
  } catch (error) {
    return errorHandler(error, true);
  }
});

export const deleteQuote = createAsyncThunk("quote/deleteQuote", async (id) => {
  try {
    const { data } = await axios({
      method: "patch",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      url: `quote/${id}`,
      data: { status: "false" },
    });

    return successHandler(data, "Devis supprimé");
  } catch (error) {
    return errorHandler(error, true);
  }
});

const quoteSlice = createSlice({
  name: "quote",
  initialState,
  reducers: {
    clearQuote: (state) => {
      state.quote = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadAllQuote.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(loadAllQuote.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data?.getAllQuote ?? action.payload?.data;
      state.total = action.payload?.data?.totalQuote;
      state.totalPage = action.payload?.data?.totalPage;
    });
    builder.addCase(loadAllQuote.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message;
    });

    builder.addCase(loadSingleQuote.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(loadSingleQuote.fulfilled, (state, action) => {
      state.loading = false;
      state.quote = action.payload?.data;
    });
    builder.addCase(loadSingleQuote.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message;
    });

    builder.addCase(addQuote.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(addQuote.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(addQuote.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message;
    });

    builder.addCase(deleteQuote.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteQuote.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(deleteQuote.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message;
    });
  },
});

export default quoteSlice.reducer;
export const { clearQuote } = quoteSlice.actions;
