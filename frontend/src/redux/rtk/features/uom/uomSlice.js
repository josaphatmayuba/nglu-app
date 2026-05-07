import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../utils/functions";
import queryGenerator from "../../../../utils/queryGenarator";

const initialState = {
  list: null,
  uom: null,
  total: null,
  error: "",
  loading: false,
  edit: false,
};

// 1 ================== load uom by paginated  ==================
export const loadAllUomPaginated = createAsyncThunk(
  "uom/loadAllUomPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`uom?${query}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 2 ================== load All uom =============================
export const loadAllUom = createAsyncThunk("uom/loadAllUom", async () => {
  try {
    const { data } = await axios.get(`uom?query=all`);

    return successHandler(data);
  } catch (error) {
    return errorHandler(error, true);
  }
});

// 3 ================== load Single uom ============================
export const loadSingleUom = createAsyncThunk(
  "uom/loadSingleUom",
  async (id) => {
    try {
      const { data } = await axios.get(`uom/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 4 ================== Add uom ====================================
export const addUom = createAsyncThunk("uom/addUom", async (values) => {
  try {
    const { data } = await axios({
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      url: `uom`,
      data: {
        ...values,
      },
    });

    return successHandler(data, "New UoM Added Successfully");
  } catch (error) {
    return errorHandler(error, true);
  }
});

// 5 ================== update uom ================================
export const updateUom = createAsyncThunk(
  "uom/updateUom",
  async ({ id, values }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `uom/${id}`,
        data: {
          ...values,
        },
      });

      return successHandler(data, " UoM Update Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6 ================== delete uom ===============================
export const deleteUom = createAsyncThunk(
  "uom/deleteUom",
  async ({ id, status }) => {

  
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `uom/${id}`,
        data: {
          status: status ? status : "false",
        },
      });

      return successHandler(
        data,
        `Uom ${status === "true" ? "is activate" : "hided"} successfully`
      );
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const uomSlice = createSlice({
  name: "uom",
  initialState,
  reducers: {
    editUoM: (state, action) => {
      if (action.payload) {
        state.edit = action.payload;
      } else {
        state.edit = false;
      }
    },
  },
  extraReducers: (builder) => {
    // 1 ================== get uom by paginated ==================
    builder.addCase(loadAllUomPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllUomPaginated.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data.getAllUoM;
      state.total = action.payload.data.totalUoM;
    });

    builder.addCase(loadAllUomPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2 ================== get all Uom ==================
    builder.addCase(loadAllUom.pending, (state, action) => {
      state.loading = true;
    });

    builder.addCase(loadAllUom.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });

    builder.addCase(loadAllUom.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3 ================== get single Uom ==================
    builder.addCase(loadSingleUom.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleUom.fulfilled, (state, action) => {
      state.loading = false;
      state.uom = action.payload?.data;
    });

    builder.addCase(loadSingleUom.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4 ================== add Uom ==================
    builder.addCase(addUom.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addUom.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addUom.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5 ================== update Uom ==================
    builder.addCase(updateUom.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateUom.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateUom.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 6 ================== delete Uom ==================
    builder.addCase(deleteUom.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteUom.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteUom.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default uomSlice.reducer;
export const { editUoM } = uomSlice.actions;
