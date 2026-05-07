import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import toast from "react-hot-toast";
import {
  compareArrays,
  errorHandler,
  successHandler,
} from "../../../../../utils/functions";
import queryGenerator from "../../../../../utils/queryGenarator";

const localCart = localStorage.getItem("cart");

const initialState = {
  list: localCart ? { cartProducts: JSON.parse(localCart) } : null,
  cart: null,
  error: "",
  loading: false,
  report: null,
  info: null,
};

// 1. ==================== load All cart ========================
export const loadAllCartByCustomerId = createAsyncThunk(
  "cart/loadAllCartByCustomerId",
  async (id) => {
    try {
      const { data } = await axios.get(`/cart/customer/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error);
    }
  }
);

// 2. ==================== load All cart by paginated ========================
export const loadAllCartPaginated = createAsyncThunk(
  "cart/loadAllCartPaginated",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(
        `product-category?query=categoryWithSubcategory&${query}`
      );

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 3. ==================== load single cart ========================
export const loadSingleCart = createAsyncThunk(
  "cart/loadSingleCart",
  async (id) => {
    try {
      const { data } = await axios.get(`cart/${id}`);

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
// 4. ==================== add cart ========================
export const addToCart = createAsyncThunk("cart/addToCart", async (values) => {
  try {
    const { data } = await axios({
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      url: `cart`,
      data: values,
    });

    return successHandler(data, "Product added to cart successfully");
  } catch (error) {
    return errorHandler(error, true);
  }
});
// ======================= local cart add server ==========================
export const addLocalCartInServer = createAsyncThunk(
  "cart/addLocalCartInServer",
  async (values) => {
    try {
      const { data } = await axios({
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `cart`,
        data: values,
      });

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 5. ==================== update cart ========================
export const updateCart = createAsyncThunk(
  "cart/updateCart",
  async ({ id, values }, { dispatch }) => {
    try {
      const { data } = await axios({
        method: "put",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
        },
        url: `/cart/cart-product/${id}`,
        data: {
          ...values,
        },
      });

      return successHandler(data, "Cart Updated Successfully");
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);

// 6. ==================== delete cart ========================
export const deleteCart = createAsyncThunk("cart/deleteCart", async (id) => {
  try {
    const { data } = await axios({
      method: "patch",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      url: `cart/${id}`,
      data: {
        status: "false",
      },
    });

    return successHandler(data, "Cart delete Successfully");
  } catch (error) {
    return errorHandler(error, true);
  }
});
// 6. ==================== report cart ========================
export const loadAllReportCart = createAsyncThunk(
  "cart/loadAllReportCart",
  async (arg) => {
    try {
      const query = queryGenerator(arg);
      const { data } = await axios.get(
        `return-cart-order?${query}`
      );

      return successHandler(data);
    } catch (error) {
      return errorHandler(error, true);
    }
  }
);
const cartDynamicSlice = createSlice({
  name: "cartBackend",
  initialState,
  reducers: {
    addToLocalCart: (state, action) => {
      const cartProduct = action.payload.cartProduct;
      const originalProduct = action.payload.product;
      const existingCart = state?.list?.cartProducts || [];

      // checking existing cart for stock alert
      const exist = existingCart.filter(
        (item) => item.productId === cartProduct.productId
      );

      const existQuantity = exist.reduce(
        (total, current) => total + current.productQuantity,
        0
      );

      if (existQuantity >= originalProduct.productQuantity) {
        toast.error("Product stock out");
        return;
      }

      // make unique id
      const uniqueId = Date.now().toString(32);
      // get color name
      const colorName = action.payload.product?.productColor?.find(
        (color) => color.colorId === cartProduct.colorId
      )?.color?.name;
      // get selected attribute
      const selectedAttribute =
        action.payload.product?.productProductAttributeValue.filter((item) =>
          cartProduct.productAttributeValueId.includes(
            item.productAttributeValueId
          )
        );

      const OptimizeCart = {
        id: uniqueId,
        productId: cartProduct.productId,
        product: {
          name: action.payload.product.name,
          productThumbnailImage: action.payload.product.productThumbnailImage,
          productSalePriceWithVat:
            action.payload.product.productSalePriceWithVat,
        },
        productQuantity: cartProduct.productQuantity,
        productAttributeValueId: cartProduct.productAttributeValueId,
        colorId: cartProduct.colorId,
      };
      if (colorName) {
        OptimizeCart.colors = {
          name: colorName,
        };
      }
      if (selectedAttribute.length > 0) {
        //selectedAttribute is an array
        OptimizeCart.cartAttributeValue = selectedAttribute;
      }

      const existingItemIndex = existingCart.findIndex((item) => {
        const cartAttribute = item.productAttributeValueId;
        const newAttribute = cartProduct.productAttributeValueId;
        const cartColorId = item.colorId;
        const newColorId = cartProduct.colorId;
        return (
          item.productId === cartProduct.productId &&
          compareArrays(cartAttribute, newAttribute) &&
          cartColorId === newColorId
        );
      });

      if (existingItemIndex !== -1) {
        existingCart[existingItemIndex].productQuantity +=
          cartProduct.productQuantity;
      } else {
        existingCart.push(OptimizeCart);
      }

      localStorage.setItem("cart", JSON.stringify(existingCart));
      state.list = { cartProducts: [...existingCart] };
      toast.success("Product added to cart successfully");
    },

    deleteLocalCart: (state, action) => {
      const id = action.payload;
      const newState = state.list?.cartProducts?.filter(
        (item) => item.id !== id
      );
      localStorage.setItem("cart", JSON.stringify(newState));
      state.list.cartProducts = newState;
      toast.success("Cart delete Successfully");
    },

    updateLocalCart: (state, action) => {
      const id = action.payload.id;
      const type = action.payload.type;

      const newState = state.list.cartProducts.map((item) => {
        if (id === item.id) {
          return type === "increment"
            ? { ...item, productQuantity: item.productQuantity + 1 }
            : { ...item, productQuantity: item.productQuantity - 1 };
        } else return item;
      });
      localStorage.setItem("cart", JSON.stringify(newState));
      state.list.cartProducts = newState;
      toast.success("Cart Updated Successfully");
    },
  },
  extraReducers: (builder) => {
    // 1. ==================== load All cart ========================
    builder.addCase(loadAllCartByCustomerId.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllCartByCustomerId.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data;
      state.total = action.payload?.data?.totalAmount;
    });

    builder.addCase(loadAllCartByCustomerId.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 2. ==================== load All cart by paginated ========================
    builder.addCase(loadAllCartPaginated.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllCartPaginated.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload?.data.cartProducts;
      state.total = action.payload?.data.totalAmount;
    });

    builder.addCase(loadAllCartPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 3. ==================== load single cart ========================
    builder.addCase(loadSingleCart.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadSingleCart.fulfilled, (state, action) => {
      state.loading = false;
      state.cart = action.payload.data;
    });

    builder.addCase(loadSingleCart.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 4. ==================== add cart ========================
    builder.addCase(addToCart.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addToCart.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addToCart.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    builder.addCase(addLocalCartInServer.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(addLocalCartInServer.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(addLocalCartInServer.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 5. ==================== update cart ========================
    builder.addCase(updateCart.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(updateCart.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(updateCart.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
    // 6. ==================== delete cart ========================
    builder.addCase(deleteCart.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(deleteCart.fulfilled, (state, action) => {
      state.loading = false;
    });

    builder.addCase(deleteCart.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });

    // 6. ==================== Report cart ========================
    builder.addCase(loadAllReportCart.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(loadAllReportCart.fulfilled, (state, action) => {
      state.loading = false;
      state.info = action.payload.data?.aggregations._sum;
      state.report = action.payload.data?.getAllReturnCartOrder;
    });

    builder.addCase(loadAllReportCart.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
    });
  },
});

export default cartDynamicSlice.reducer;
export const { addToLocalCart, deleteLocalCart, updateLocalCart } =
  cartDynamicSlice.actions;
