import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import toast from "react-hot-toast";
import {
  LocalCartToCart,
  errorHandler,
  nameRender,
  successHandler,
} from "../../../../../utils/functions";
import queryGenerator from "../../../../../utils/queryGenarator";
import { addLocalCartInServer } from "../cart/cartSlice";
const initialState = {
  list: null,
  customer: null,
  total: null,
  error: "",
  loading: false,
};

export const customerRegister = createAsyncThunk(
  "customer/register",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `customer/register`,
        data: values,
      });
      return successHandler(data, "Register Successfully Done");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

export const updateCustomer = createAsyncThunk(
  "customer/updateCustomer",
  async ({ id, formData }) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `/customer/${id}`,
        data: formData,
      });
      return successHandler(data, "Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  "customer/deleteCustomer",
  async (id) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `customer/${id}`,
        data: {
          status: "false",
        },
      });
      return successHandler(data, "Customer deleted successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

export const loadSingleCustomer = createAsyncThunk(
  "customer/loadSingleCustomer",
  async (id) => {
    try {
      const { data } = await axios.get(`customer/${id}`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

export const loadSingleCustomerEcom = createAsyncThunk(
  "customer/loadSingleCustomerEcom",

  async () => {
    try {
      const { data } = await axios.get(`/customer/profile`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

export const loadAllCustomer = createAsyncThunk(
  "customer/loadAllCustomer",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(`customer?${query}`);
      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

export const customerLogin = createAsyncThunk(
  "customer/login",
  async (values, { dispatch }) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `customer/login`,
        data: values,
      });
      localStorage.setItem("access-token", data.token);

      const localCart = localStorage.getItem("cart");
      if (localCart) {
        const cart = LocalCartToCart(localCart);
        const resp = await dispatch(
          addLocalCartInServer({ customerId: data.id, cartProduct: cart })
        );
        if (resp.payload.message === "success") {
          localStorage.removeItem("cart");
        }
      }
      localStorage.setItem("role", data.role);
      localStorage.setItem("user", nameRender(data));
      localStorage.setItem("id", data.id);
      localStorage.setItem("isLogged", true);
      localStorage.setItem("role", data.role?.name);
      // window.location.reload();
      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
export const addCustomerGoogle = createAsyncThunk(
  "user/addCustomerGoogle",
  async (values, { dispatch }) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `/googlelogin/login`,
        data: values,
      });
      localStorage.setItem("access-token", data.token);

      const localCart = localStorage.getItem("cart");
      if (localCart) {
        const cart = LocalCartToCart(localCart);
        const resp = await dispatch(
          addLocalCartInServer({ customerId: data.id, cartProduct: cart })
        );
        if (resp.payload.message === "success") {
          localStorage.removeItem("cart");
        }
      }
      localStorage.setItem("role", data.role);
      localStorage.setItem("user", nameRender(data));
      localStorage.setItem("id", data.id);
      localStorage.setItem("isLogged", true);
      localStorage.setItem("role", data.role?.name);
      window.location.reload();
      return {
        data,
        message: "success",
      };
    } catch (error) {
      toast.error("Incorrect Username or Password!");
      return {
        message: "error",
      };
    }
  }
);

export const customerForgetPasswordRequest = createAsyncThunk(
  "customer/customerForgetPasswordRequest",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `customer/request-forgot-password`,
        data: values,
      });
      return successHandler(data, "Check your email for next step");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

export const customerForgetPassword = createAsyncThunk(
  "customer/customerForgetPassword",
  async (values) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `/customer/forgot-password`,
        data: values,
      });
      return successHandler(data, "Your password recovered, please login");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
export const customerResetPassword = createAsyncThunk(
  "customer/customerResetPassword",
  async ({id, values}) => {
    try {
      const { data } = await axios({
        method: "patch",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `/customer/reset-password/${id}`,
        data: values
      });
      return successHandler(data, "Your password reset successful, please login");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

const customerECommerce = createSlice({
  name: "customerECommerce",
  initialState,
  reducers: {
    clearCustomer: (state) => {
      state.customer = null;
    },
  },
  extraReducers: (builder) => {
    // 1) ====== builders for loadAllCustomer ======

    builder.addCase(loadAllCustomer.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllCustomer.fulfilled, (state, action) => {
      state.loading = false;
      if (Array.isArray(action.payload?.data)) {
        state.list = action.payload?.data;
      } else {
        state.list = action.payload?.data.getAllCustomer;
        state.total = action.payload?.data.totalCustomer;
      }
    });

    builder.addCase(loadAllCustomer.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2) ====== builders for addCustomer ======

    builder.addCase(customerRegister.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(customerRegister.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(customerRegister.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3) ====== builders for loadSingleCustomer ======

    builder.addCase(loadSingleCustomer.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleCustomer.fulfilled, (state, action) => {
      state.loading = false;
      state.customer = action.payload?.data;
    });

    builder.addCase(loadSingleCustomer.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3) ====== builders for loadSingleCustomerEcom ======

    builder.addCase(loadSingleCustomerEcom.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleCustomerEcom.fulfilled, (state, action) => {
      state.loading = false;
      state.customer = action.payload?.data;
    });

    builder.addCase(loadSingleCustomerEcom.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4) ====== builders for deleteCustomer ======

    builder.addCase(deleteCustomer.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteCustomer.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteCustomer.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default customerECommerce.reducer;
export const { clearCustomer } = customerECommerce.actions;
