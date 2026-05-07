import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { errorHandler, successHandler } from "../../../../../utils/functions";

const initialState = {
  list: null,
  publicList: null,
  slider: null,
  loading: false,
  error: "",
};
// 1. ============== load all slider =================
export const loadAllSliderImages = createAsyncThunk(
  "slider/loadAllSliderImages",
  async () => {
    try {
      const { data } = await axios.get(`slider-images?query=all`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
// 1. ============== load all slider =================
export const loadAllSliderImagesPublic = createAsyncThunk(
  "slider/loadAllSliderImagesPublic",
  async () => {
    try {
      const { data } = await axios.get(`/slider-images/public?query=all`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);
// 2. ================ add slider ====================
export const addSliderImages = createAsyncThunk(
  "slider/addSliderImages",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `slider-images`,
        data: values,
      });

      return successHandler(data, "New Slider Images Added Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 3. ================ update slider ====================
export const updateSliderImages = createAsyncThunk(
  "slider/updateSliderImages",
  async ({ id, values }) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `slider-images/${id}`,
        data: values,
      });
      return successHandler(data, "Slider Images Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 3. ================ delete slider ====================
export const deleteSlider = createAsyncThunk(
  "slider/deleteSlider",
  async (id) => {
    try {
      const { data } = await axios({
        method: "delete",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `slider-images/${id}`,
      });

      return successHandler(data, "Slider delete Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const sliderSlice = createSlice({
  name: "sliderImages",
  initialState,
  extraReducers: (builder) => {
    //1. ==============load all slider===================
    builder.addCase(loadAllSliderImages.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(loadAllSliderImages.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload.data;
    });
    builder.addCase(loadAllSliderImages.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    //1. ==============load loadAllSliderImagesPublic  slider===================
    builder.addCase(loadAllSliderImagesPublic.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(loadAllSliderImagesPublic.fulfilled, (state, action) => {
      state.loading = false;
      state.publicList = action.payload.data;
    });
    //2. ============== add slider===================
    builder.addCase(addSliderImages.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(addSliderImages.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(addSliderImages.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    //1. ============== update slider===================
    builder.addCase(updateSliderImages.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateSliderImages.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(updateSliderImages.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    //1. ============== delete slider===================
    builder.addCase(deleteSlider.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteSlider.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(deleteSlider.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default sliderSlice.reducer;
