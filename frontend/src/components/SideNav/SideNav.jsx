import { cn } from "@/utils/functions";
import {
  AppstoreOutlined,
  CodeSandboxOutlined,
  FileDoneOutlined,
  FileOutlined,
  FileProtectOutlined,
  FileSyncOutlined,
  HomeOutlined,
  ImportOutlined,
  MinusSquareOutlined,
  OrderedListOutlined,
  PlusSquareOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  TeamOutlined,
  UngroupOutlined,
  UnorderedListOutlined,
  UserOutlined,
  UserSwitchOutlined,
  UsergroupAddOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import { BiSolidDiscount } from "react-icons/bi";
import { BsBuildingFillGear } from "react-icons/bs";
import { FaBusinessTime } from "react-icons/fa";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { IoDocumentTextOutline } from "react-icons/io5";
import {
  MdAcUnit,
  MdOutlineAppSettingsAlt,
  MdOutlineAttachMoney,
  MdOutlineEditAttributes,
  MdOutlineInvertColors,
} from "react-icons/md";
import { TbShoppingCartCog } from "react-icons/tb";
import { useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import Menu from "../../UI/Menu";
import usePermissions from "../../utils/usePermissions";
import SideNavLoader from "./SideNavLoader";

const SideNav = ({ collapsed, setCollapsed }) => {
  const { permissions } = usePermissions();
  const [isSetting, setIsSetting] = useState(false);
  const { loading } = useSelector((state) => state.auth);

  const { data } = useSelector((state) => state?.setting) || {};

  const menu = [
    Array.isArray(permissions) &&
    permissions.length > 0 && {
      label: (
        <NavLink to="/admin/dashboard">
          <span>DASHBOARD</span>
        </NavLink>
      ),
      permit: {
        permissions: ["readAll-dashboard", "create-dashboard"],
        operator: "or",
      },
      key: "dashboard",
      icon: <HomeOutlined />,
    },

    data.isPos === "true" && {
      permit: {
        permissions: ["create-saleInvoice", "readAll-saleInvoice"],
        operator: "or",
      },
      label: (
        <NavLink
          to="/admin/pos"
          onClick={() => setCollapsed && setCollapsed(true)}
        >
          <span>POS</span>
        </NavLink>
      ),

      key: "pos",
      icon: <ShoppingCartOutlined />,
    },

    {
      label: "INVENTORY",
      key: "inventory",
      permit: {
        permissions: ["readAll-product", "create-product"],
        operator: "or",
      },
      icon: <CodeSandboxOutlined />,
      children: [
        {
          label: (
            <NavLink to="/admin/product">
              <span>PRODUCT</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "readAll-product",
              "create-product",
              "readSingle-product",
              "update-product",
              "delete-product",
            ],
            operator: "or",
          },
          key: "products",
          icon: <UnorderedListOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/product-sort-list">
              <span>SHORTAGE PRODUCTS</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "readAll-product",
              "create-product",
              "readSingle-product",
              "update-product",
              "delete-product",
            ],
            operator: "or",
          },
          key: "productSortList",
          icon: <OrderedListOutlined />,
        },
      ],
    },

    {
      label: "PURCHASE",
      permit: {
        permissions: [
          "readAll-purchaseInvoice",
          "readAll-supplier",
          "readAll-purchaseInvoice",
          "readAll-purchaseReorderInvoice",
          "create-purchaseInvoice",
          "create-supplier",
          "create-purchaseReorderInvoice",
          "create-returnPurchaseInvoice",
          "readAll-returnPurchaseInvoice",
        ],
        operator: "or",
      },
      key: "PURCHASE",
      icon: <PlusSquareOutlined />,
      children: [
        {
          label: (
            <NavLink to="/admin/purchase">
              <span>PURCHASE INVOICE</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "readAll-purchaseInvoice",
              "readSingle-purchaseInvoice",
              "create-purchaseInvoice",
              "update-purchaseInvoice",
              "delete-purchaseInvoice",
            ],
            operator: "or",
          },
          key: "purchases",
          icon: <UnorderedListOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/supplier">
              <span>SUPPLIERS</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "readAll-supplier",
              "create-supplier",
              "readSingle-supplier",
              "update-supplier",
              "delete-supplier",
            ],
            operator: "or",
          },
          key: "suppliers",
          icon: <UserOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/purchase-return-list">
              <span>PURCHASE RETURN</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-returnPurchaseInvoice",
              "readAll-returnPurchaseInvoice",
              "readSingle-returnPurchaseInvoice",
              "update-returnPurchaseInvoice",
              "delete-returnPurchaseInvoice",
            ],
            operator: "or",
          },
          key: "purchaseReturn",
          icon: <OrderedListOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/purchase-reorder-invoice">
              <span>PURCHASE ORDER</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-purchaseReorderInvoice",
              "readAll-purchaseReorderInvoice",
              "readSingle-purchaseReorderInvoice",
              "update-purchaseReorderInvoice",
              "delete-purchaseReorderInvoice",
            ],
            operator: "or",
          },
          key: "purchaseOrder",
          icon: <OrderedListOutlined />,
        },
      ],
    },
    {
      label: "SALE",
      permit: {
        permissions: [
          "create-saleInvoice",
          "readAll-saleInvoice",
          "create-returnSaleInvoice",
          "readAll-returnSaleInvoice",
          "create-customer",
          "readAll-customer",
        ],
        operator: "or",
      },
      key: "SALE",
      icon: <MinusSquareOutlined />,
      children: [
        {
          label: (
            <NavLink to="/admin/sale">
              <span>SALE INVOICE</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-saleInvoice",
              "readAll-saleInvoice",
              "readSingle-saleInvoice",
              "update-saleInvoice",
              "delete-saleInvoice",
            ],
            operator: "or",
          },
          key: "sells",
          icon: <UnorderedListOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/customer">
              <span>CUSTOMERS</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "readAll-customer",
              "readSingle-customer",
              "create-customer",
              "update-customer",
              "delete-customer",
            ],
            operator: "or",
          },
          key: "customers",
          icon: <UserOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/sale-return-list">
              <span>SALE RETURN</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-returnSaleInvoice",
              "readAll-returnSaleInvoice",
              "readSingle-returnSaleInvoice",
            ],
            operator: "or",
          },
          key: "saleReturn",
          icon: <OrderedListOutlined />,
        },
      ],
    },

    {
      label: "ACCOUNTS",
      permit: {
        permissions: [
          "create-account",
          "readAll-account",
          "create-transaction",
          "readAll-transaction",
          "create-productReports",
          "readAll-productReports",
        ],
        operator: "or",
      },
      key: "accounts",
      icon: <WalletOutlined />,
      children: [
        {
          label: (
            <NavLink to="/admin/account/">
              <span>ACCOUNT</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-account",
              "readAll-account",
              "readSingle-account",
              "update-account",
              "delete-account",
            ],
            operator: "or",
          },
          key: "accountList",
          icon: <UnorderedListOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/transaction/">
              <span>TRANSACTION</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-transaction",
              "readAll-transaction",
              "readSingle-transaction",
              "update-transaction",
              "delete-transaction",
            ],
            operator: "or",
          },
          key: "transactionList",
          icon: <UnorderedListOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/account/trial-balance">
              <span>TRIAL BALANCE</span>
            </NavLink>
          ),
          permit: {
            permissions: ["readAll-account", "readSingle-account"],
            operator: "or",
          },
          key: "trialBalance",
          icon: <FileDoneOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/account/balance-sheet">
              <span>BALANCE SHEET</span>
            </NavLink>
          ),
          permit: {
            permissions: ["readAll-account", "readSingle-account"],
            operator: "or",
          },
          key: "balanceSheet",
          icon: <FileOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/account/income">
              <span>INCOME STATEMENT</span>
            </NavLink>
          ),
          permit: {
            permissions: ["readAll-account", "readSingle-account"],
            operator: "or",
          },
          key: "incomeStatement",
          icon: <FileSyncOutlined />,
        },
      ],
    },
    Array.isArray(permissions) &&
    permissions.length > 0 && {
      label: "REPORT",
      key: "report",
      icon: <IoDocumentTextOutline size={16} />,
      permit: {
        permissions: [
          "create-productReports",
          "readAll-productReports",
          "create-purchaseInvoice",
          "readAll-purchaseInvoice",
          "create-saleInvoice",
          "readAll-saleInvoice",
          "create-supplier",
          "readAll-supplier",
          "create-customer",
          "readAll-customer",
          "create-manualPayment",
          "readAll-manualPayment",
        ],
        operator: "or",
      },
      children: [
        {
          label: (
            <NavLink to="/admin/product-report">
              <span>INVENTORY REPORT</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "readSingle-productReports",
              "readAll-productReports",
            ],
            operator: "or",
          },
          key: "productReport",
          icon: <FileSyncOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/purchase-report">
              <span>PURCHASE REPORT</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "readSingle-purchaseInvoice",
              "readAll-purchaseInvoice",
            ],
            operator: "or",
          },
          key: "purchaseReport",
          icon: <FileSyncOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/sale-report">
              <span>SALE REPORT</span>
            </NavLink>
          ),
          permit: {
            permissions: ["readAll-saleInvoice", "readAll-saleInvoice"],
            operator: "or",
          },
          key: "saleReport",
          icon: <FileSyncOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/supplier-report">
              <span>SUPPLIER REPORT</span>
            </NavLink>
          ),
          permit: {
            permissions: ["readAll-supplier", "readAll-supplier"],
            operator: "or",
          },
          key: "supplierReport",
          icon: <FileSyncOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/customer-report">
              <span>CUSTOMER REPORT</span>
            </NavLink>
          ),
          permit: {
            permissions: ["readSingle-customer", "readAll-customer"],
            operator: "or",
          },
          key: "customerReport",
          icon: <FileSyncOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/payment-report">
              <span>PAYMENT REPORT</span>
            </NavLink>
          ),
          permit: {
            permissions: ["readAll-manualPayment", "readAll-manualPayment"],
            operator: "or",
          },
          key: "paymentReport",
          icon: <FileSyncOutlined />,
        },
      ],
    },
  ];

  const SettingMenu = [
    {
      label: (
        <NavLink to="/admin/company-setting">
          <span>COMPANY SETTINGS</span>
        </NavLink>
      ),
      permit: {
        permissions: ["create-setting", "readAll-setting"],
        operator: "or",
      },
      key: "invoiceSetting",
      icon: <BsBuildingFillGear />,
    },
    {
      label: (
        <NavLink to="/admin/app-settings">
          <span>APP SETTINGS</span>
        </NavLink>
      ),
      permit: {
        permissions: ["create-setting", "readAll-setting"],
        operator: "or",
      },
      key: "appSettings",
      icon: <MdOutlineAppSettingsAlt />,
    },
    {
      label: "HR",
      permit: {
        permissions: [
          "create-user",
          "readAll-user",
          "create-rolePermission",
          "readAll-rolePermission",
          "create-designation",
          "readAll-designation",
          "create-department",
          "readAll-department",
          "create-shift",
          "readAll-shift",
          "create-employmentStatus",
          "readAll-employmentStatus",
          "create-role",
          "readAll-role"
        ],
        operator: "or",
      },
      key: "hr",
      icon: <TeamOutlined />,
      children: [
        {
          label: (
            <NavLink to="/admin/hr/staffs">
              <span>STAFFS</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-user", "readAll-user"],
            operator: "or",
          },
          key: "staffs",
          icon: <UsergroupAddOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/role">
              <span>ROLE & PERMISSIONS</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-role", "readAll-role"],
            operator: "or",
          },
          key: "roleAndPermissions",
          icon: <UserSwitchOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/designation/">
              <span>DESIGNATION</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-designation", "readAll-designation"],
            operator: "or",
          },
          key: "designation",
          icon: <SolutionOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/department/">
              <span>DEPARTMENT</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-department", "readAll-department"],
            operator: "or",
          },
          key: "department",
          icon: <HiOutlineBuildingOffice2 />,
        },
        {
          label: (
            <NavLink to="/admin/shift/">
              <span>SHIFT</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-shift", "readAll-shift"],
            operator: "or",
          },
          key: "shift",
          icon: <FaBusinessTime />,
        },
        {
          label: (
            <NavLink to="/admin/employment-status/">
              <span>EMPLOYMENT STATUS</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-employmentStatus",
              "readAll-employmentStatus",
            ],
            operator: "or",
          },
          key: "employmentStatus",
          icon: <FaBusinessTime />,
        },
      ],
    },
    {
      label: "INVENTORY",
      key: "inventory",
      icon: <TbShoppingCartCog />,
      permit: {
        permissions: [
          "create-productCategory",
          "readAll-productCategory",
          "create-productSubCategory",
          "readAll-productSubCategory",
          "create-productBrand",
          "readAll-productBrand",
          "create-color",
          "readAll-color",
          "create-uom",
          "readAll-uom",
          "create-productAttribute",
          "readAll-productAttribute",
          "create-product",
          "readAll-product",
          "create-pageSize",
          "readAll-pageSize",
        ],
        operator: "or",
      },
      children: [
        {
          label: (
            <NavLink to="/admin/product-category">
              <span>PRODUCT CATEGORY</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-productCategory", "readAll-productCategory"],
            operator: "or",
          },
          key: "productCategory",
          icon: <AppstoreOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/product-subcategory">
              <span>PRODUCT SUBCATEGORY</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-productSubCategory",
              "readAll-productSubCategory",
            ],
            operator: "or",
          },
          key: "productSubcategory",
          icon: <UngroupOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/product-brand">
              <span>PRODUCT BRAND</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-productBrand", "readAll-productBrand"],
            operator: "or",
          },
          key: "productBrand",
          icon: <FileProtectOutlined />,
        },

        {
          label: (
            <NavLink to="/admin/product-color">
              <span>PRODUCT COLOR</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-color", "readAll-color"],
            operator: "or",
          },
          key: "productColor",
          icon: <MdOutlineInvertColors />,
        },
        {
          label: (
            <NavLink to="/admin/product-attribute">
              <span>PRODUCT ATTRIBUTE</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-productAttribute",
              "readAll-productAttribute",
            ],
            operator: "or",
          },
          key: "productAttribute",
          icon: <MdOutlineEditAttributes />,
        },

        {
          label: (
            <NavLink to="/admin/uom">
              <span>UOM</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-uom", "readAll-uom"],
            operator: "or",
          },
          key: "UoM",
          icon: <MdAcUnit />,
        },
        {
          label: (
            <NavLink to="/admin/import-product">
              <span>IMPORT PRODUCT</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-product", "readAll-product"],
            operator: "or",
          },
          key: "import_csv",
          icon: <ImportOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/print-page-setting">
              <span>BARCODE PAGE SETTING</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-pageSize", "readAll-pageSize"],
            operator: "or",
          },
          key: "Barcode page setting",
        },
      ],
    },
    {
      label: "OTHERS",
      key: "Others",
      icon: <SettingOutlined />,
      permit: {
        permissions: [
          "create-discount",
          "readAll-discount",
          "create-currency",
          "readAll-currency",
          "create-vat",
          "readAll-vat",
        ],
        operator: "or",
      },
      children: [
        {
          label: (
            <NavLink to="/admin/discount">
              <span>DISCOUNT</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-discount", "readAll-discount"],
            operator: "or",
          },
          key: "Discount",
          icon: <BiSolidDiscount />,
        },
        {
          label: (
            <NavLink to="/admin/currency">
              <span>CURRENCY</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-currency", "readAll-currency"],
            operator: "or",
          },
          key: "Currency",
          icon: <MdOutlineAttachMoney />,
        },
        {
          label: (
            <NavLink to="/admin/vat-tax">
              <span>VAT/TAX</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-vat", "readAll-vat"],
            operator: "or",
          },
          key: "VAT/TAX",
          icon: <SettingOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/terms-and-condition">
              <span>TERMS AND CONDITIONS</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-termsAndCondition", "readAll-termsAndCondition"],
            operator: "or",
          },
          key: "termsAndConditions",
          icon: <SettingOutlined />,
        },
      ],
    },
  ];

  return (
    <div className="overflow-y-auto no-scrollbar h-[calc(100vh-100px)] pb-4">
      {loading ? (
        <SideNavLoader />
      ) : (
        <div className="relative">
          <div
            className={cn(
              `absolute w-full  transition-all duration-300 ${isSetting ? "left-[280px]" : "left-0"
              }`
            )}
          >
            <Menu
              items={menu}
              setCollapsed={setCollapsed}
              permissions={permissions}
              collapsed={collapsed}
            />
            {Array.isArray(permissions) && permissions.length > 0 && (
              <div
                className={cn(
                  "px-4 flex items-center justify-between font-Popins  hover:bg-[rgb(71,74,120)] py-3 cursor-pointer",
                  {
                    "flex items-center justify-center px-0 text-lg": collapsed,
                  }
                )}
                onClick={() => setIsSetting(true)}
              >
                <span className="flex items-center gap-1">
                  <SettingOutlined /> {!collapsed && "SETTINGS"}
                </span>
                {!collapsed && <IoIosArrowForward />}
              </div>
            )}
          </div>

          <div
            className={cn(
              `absolute w-full  transition-all duration-300 ${isSetting ? "left-0" : "-left-[280px]"
              }`
            )}
          >
            <div
              className={cn(
                "px-4 flex items-center font-medium gap-1 font-Popins bg-[rgb(71,74,95)] hover:bg-[rgb(71,74,120)] py-3 cursor-pointer",
                {
                  "flex items-center justify-center text-lg": collapsed,
                }
              )}
              onClick={() => setIsSetting(false)}
            >
              <IoIosArrowBack /> {!collapsed && "BACK TO MENU"}
            </div>
            <hr className=" border-gray-500" />
            <Menu
              items={SettingMenu}
              setCollapsed={setCollapsed}
              permissions={permissions}
              collapsed={collapsed}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SideNav;
