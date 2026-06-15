import { configureStore } from "@reduxjs/toolkit";

import accountReducer from "../features/account/accountSlice";
import adjustInventorySlice from "../features/adjustInventory/adjustInventorySlice";
import authSlice from "../features/auth/authSlice";
import awardSlice from "../features/award/awardSlice";
import awardHistorySlice from "../features/awardHistory/awardHistorySlice";
import cartReducer from "../features/cart/cartSlice";
import colorReducer from "../features/color/colorSlice";
import customerReducer from "../features/customer/customerSlice";
import customerPaymentReducer from "../features/customerPayment/customerPaymentSlice";
import dashboardReducer from "../features/dashboard/dashboardSlice";
import departmentSlice from "../features/department/departmentSlice";
import designationReducer from "../features/designation/designationSlice";
import designationHistorySlice from "../features/designationHistory/designationHistorySlice";
import cartDynamicSlice from "../features/eCommerce/cart/cartSlice";
import cartOrder from "../features/eCommerce/cartOrder/cartOrderSlice";
import categoryListSlice from "../features/eCommerce/categoryList/categoryListSlice";
import courierMediumSlice from "../features/eCommerce/courierMedium/courierMediumSlice";
import currencySlice from "../features/eCommerce/currency/currencySlice";
import customerECommerce from "../features/eCommerce/customer/customerSlice";
import deliveryFeeSlice from "../features/eCommerce/deliveryFee/deliveryFeeSlice";
import discountSlice from "../features/eCommerce/discount/discountSlice";
import productPublicRelatedSlice from "../features/eCommerce/product/productPublicRelatedSlice";
import productAttributeSlice from "../features/eCommerce/productAttribute/productAttribute";
import productAttributeValueSlice from "../features/eCommerce/productAttributeValue/productAttributeValueSlice";
import productPublicSearchSlice from "../features/eCommerce/productSearch/productSearchSlice";
import returnOrderSlice from "../features/eCommerce/returnOrder/returnOrderSlice";
import reviewRatingSlice from "../features/eCommerce/reviewRating/reviewRatingSlice";
import sliderSlice from "../features/eCommerce/slider/sliderSlice";
import wishlistSlice from "../features/eCommerce/wishlist/wishlistSlice";
import educationSlice from "../features/education/educationSlice";
import emailConfigSlice from "../features/emailConfig/emailConfigSlice";
import emailConfigAppSettingSlice from "../features/EmailConfigAppSettings/emailConfigAppSettingSlice";
import employeeStatusSlice from "../features/employeeStatus/employeeStatusSlice";
import holdSaleSlice from "../features/holdSale/holdSaleSlice";
import permissionSlice from "../features/hr/role/permissionSlice";
import roleSlice from "../features/hr/role/roleSlice";
import manualPaymentSlice from "../features/manualPayment/manualPaymentSlice";
import paymentMethodSlice from "../features/paymentMethod/paymentMethodSlice";
import printPageSlice from "../features/printPage/printPageSlice";
import propertyManagementSlice from "../features/propertyManagement/propertyManagementSlice";
import productSearchSlice from "../features/product/productSearchSlice";
import productReducer from "../features/product/productSlice";
import productBrandReducer from "../features/productBrand/productBrandSlice";
import productCategoryReducer from "../features/productCategory/productCategorySlice";
import ProductSortListSlice from "../features/productSortList/ProductSortListSlice";
import productSubCategoryReducer from "../features/productSubCategory/productSubCategorySlice";
import purchaseReducer from "../features/purchase/purchaseSlice";
import purchaseOrderSlice from "../features/purchaseOrder/purchaseOrderSlice";
import PurchaseReturnListSlice from "../features/PurchaseReturnList/PurchaseReturnListSlice";
import salaryHistorySlice from "../features/salaryHistory/salaryHistorySlice";
import saleReducer from "../features/sale/saleSlice";
import SaleReturnListSlice from "../features/SaleReturnList/SaleReturnListSlice";
import settingReducer from "../features/setting/settingSlice";
import shiftSlice from "../features/shift/shiftSlice";
import supplierReducer from "../features/supplier/supplierSlice";
import supplierPaymentReducer from "../features/supplierPayment/supplierPaymentSlice";
import termsAndConditionSlice from "../features/termsAndCondition/termsAndConditionSlice";
import transactionReducer from "../features/transaction/transactionSlice";
import transactionTypeReducer from "../features/transactionType/transactionTypeSlice";
import projectReducer from "../features/project/projectSlice";
import uomSlice from "../features/uom/uomSlice";
import userReducer from "../features/user/userSlice";
import vatTaxSlice from "../features/vatTax/vatTaxSlice";
import notificationPreferencesReducer from "../features/notificationPreferences/notificationPreferencesSlice";

const store = configureStore({
  reducer: {
    cart: cartReducer,
    cartDynamic: cartDynamicSlice,
    suppliers: supplierReducer,
    products: productReducer,
    productSearch: productSearchSlice,
    purchases: purchaseReducer,
    purchaseReturn: PurchaseReturnListSlice,
    purchaseOrder: purchaseOrderSlice,
    customers: customerReducer,
    sales: saleReducer,
    saleReturn: SaleReturnListSlice,
    adjustInventory: adjustInventorySlice,
    users: userReducer,
    supplierPayments: supplierPaymentReducer,
    accounts: accountReducer,
    dashboard: dashboardReducer,
    transactions: transactionReducer,
    transactionTypes: transactionTypeReducer,
    project: projectReducer,
    propertyManagement: propertyManagementSlice,
    productCategories: productCategoryReducer,
    productSubCategories: productSubCategoryReducer,
    productBrands: productBrandReducer,
    designations: designationReducer,
    colors: colorReducer,
    customerPayments: customerPaymentReducer,
    vatTax: vatTaxSlice,
    role: roleSlice,
    permission: permissionSlice,
    setting: settingReducer,
    productSortList: ProductSortListSlice,
    print: printPageSlice,
    holdSale: holdSaleSlice,
    salaryHistory: salaryHistorySlice,
    designationHistory: designationHistorySlice,
    award: awardSlice,
    awardHistory: awardHistorySlice,
    education: educationSlice,
    department: departmentSlice,
    shift: shiftSlice,
    employmentStatus: employeeStatusSlice,
    emailConfig: emailConfigSlice,
    emailConfigAppSetting: emailConfigAppSettingSlice,
    uom: uomSlice,
    termsAndConditions: termsAndConditionSlice,
    // e-commerce slice
    customerECommerce: customerECommerce,
    courierMedium: courierMediumSlice,
    currency: currencySlice,
    discount: discountSlice,
    reviewRating: reviewRatingSlice,
    productAttribute: productAttributeSlice,
    productAttributeValue: productAttributeValueSlice,
    categoryList: categoryListSlice,
    productPublicRelated: productPublicRelatedSlice,
    productPublicSearch: productPublicSearchSlice,
    slider: sliderSlice,
    wishlist: wishlistSlice,
    ESale: cartOrder,
    auth: authSlice,
    manualPayment: manualPaymentSlice,
    paymentMethod: paymentMethodSlice,
    returnOrder: returnOrderSlice,
    deliveryFee: deliveryFeeSlice,
    notificationPreferences: notificationPreferencesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          "product/loadSingleProduct/fulfilled",
          "vatTax/loadVatTaxStatement/fulfilled",
          "transaction/deleteStaff/fulfilled",
          "productCategory/loadSingleProductCategory/fulfilled",
          "productSubCategory/loadSingleProductSubCategory/fulfilled",
          "productBrand/loadSingleProductBrand/fulfilled",
          "supplier/loadSupplier/fulfilled",
          "customer/loadSingleCustomer/fulfilled",
          "sale/loadSingleSale/fulfilled",
          "user/loadSingleStaff/fulfilled",
          "designation/loadSingleDesignation/fulfilled",
          "user/loadSingleStaff/fulfilled",
        ],
      },
    }).concat(),
});

export default store;
