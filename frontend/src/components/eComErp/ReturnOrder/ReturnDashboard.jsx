
import { Tooltip } from "antd";
import React, { Fragment } from "react";
import { FaCoins } from "react-icons/fa";
import {
  FaMoneyBillTransfer,
  FaMoneyBillTrendUp,
  FaMoneyBills,
} from "react-icons/fa6";
import { abbreviateNumber } from "../../../utils/nFormetter";
import useCurrency from "../../../utils/useCurrency";

const ReturnDashboard = ({ information, count }) => {
  const currency = useCurrency();
  return (
    <Fragment>
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-5 mb-5">
        <div className="ant-shadow w-full relative sm:p-2 dark:bg-[#2e2d35] flex sm:justify-center items-center md:p-6 p-2 bg-white rounded-lg dashboard-card-bg">
          <div className="sm:hidden inline-flex flex-shrink-0 items-center justify-center h-14 w-14 text-violet-600 bg-violet-100 rounded-lg mr-6">
            <FaCoins size={30} />
          </div>
          <div>
            <Tooltip
              title={
                <span className="text-lg">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: currency?.currencySymbol,
                    }}
                  />
                  {information?.totalAmount.toFixed(3)}
                </span>
              }
            >
              <span className="block text-violet-600 text-2xl sm:text-3xl font-bold sm:text-center">
                {" "}
                <span
                  dangerouslySetInnerHTML={{
                    __html: currency?.currencySymbol,
                  }}
                />
                {information?.totalAmount
                  ? abbreviateNumber(Number(information.totalAmount))
                  : 0}
              </span>
              <span className="uppercase sm:text-[14px] block font-semibold sm:font-bold sm:mt-2  dark:text-yellow-100 ">
                Total Return Orders{" "}
                <span className="text-violet-600">
                  #{count ? abbreviateNumber(count) : 0}
                </span>
              </span>
            </Tooltip>
          </div>
        </div>

        <div className="ant-shadow w-full relative sm:p-2 dark:bg-[#2e2d35] flex sm:justify-center items-center md:p-6 p-2 bg-white rounded-lg dashboard-card-bg">
          <div className="sm:hidden inline-flex flex-shrink-0 items-center justify-center h-14 w-14 text-violet-500 bg-violet-100 rounded-lg mr-6">
            <FaMoneyBills size={30} />
          </div>
          <div>
            <Tooltip
              title={
                <span className="text-lg">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: currency?.currencySymbol,
                    }}
                  />
                  {information?.totalReturnPaidAmount.toFixed(3)}
                </span>
              }
            >
              <span className="block text-violet-500 text-2xl sm:text-3xl font-bold sm:text-center">
                <span
                  dangerouslySetInnerHTML={{
                    __html: currency?.currencySymbol,
                  }}
                />
                {information?.totalReturnPaidAmount
                  ? abbreviateNumber(Number(information.totalReturnPaidAmount))
                  : 0}
              </span>

              <span className="uppercase sm:text-[14px] block font-semibold sm:font-bold sm:mt-2  dark:text-yellow-100 ">
                Total Return Paid{" "}
              </span>
            </Tooltip>
          </div>
        </div>

        <div className="ant-shadow w-full relative sm:p-2 dark:bg-[#2e2d35] flex sm:justify-center items-center md:p-6 p-2 bg-white rounded-lg dashboard-card-bg">
          <div className="sm:hidden inline-flex flex-shrink-0 items-center justify-center h-14 w-14 text-blue-600 bg-blue-100 rounded-lg mr-6">
            <FaMoneyBillTransfer size={30} />
          </div>
          <div>
            <Tooltip
              title={
                <span className="text-lg">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: currency?.currencySymbol,
                    }}
                  />
                  {information?.totalReturnDiscountAmount.toFixed(3)}
                </span>
              }
            >
              <span className="block text-blue-600 text-2xl sm:text-3xl font-bold sm:text-center">
                <span
                  dangerouslySetInnerHTML={{
                    __html: currency?.currencySymbol,
                  }}
                />
                {information?.totalReturnDiscountAmount
                  ? abbreviateNumber(information?.totalReturnDiscountAmount)
                  : 0}
              </span>
              <span className="uppercase sm:text-[14px] block font-semibold sm:font-bold sm:mt-2 dark:text-yellow-100 ">
                {" "}
                Total Return Discount{" "}
              </span>
            </Tooltip>
          </div>
        </div>

        <div className="ant-shadow w-full relative sm:p-2 dark:bg-[#2e2d35] flex sm:justify-center items-center md:p-6 p-2 bg-white rounded-lg dashboard-card-bg">
          <div className="sm:hidden inline-flex flex-shrink-0 items-center justify-center h-14 w-14 text-blue-600 bg-blue-100 rounded-lg mr-6">
            <FaMoneyBillTrendUp size={30} />
          </div>
          <div>
            <Tooltip
              title={
                <span className="text-lg">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: currency?.currencySymbol,
                    }}
                  />
                  {information?.totalReturnVatAmount.toFixed(3)}
                </span>
              }
            >
              <span className="block text-blue-600 text-2xl sm:text-3xl font-bold sm:text-center">
                <span
                  dangerouslySetInnerHTML={{
                    __html: currency?.currencySymbol,
                  }}
                />
                {information?.totalReturnVatAmount
                  ? abbreviateNumber(information?.totalReturnVatAmount)
                  : 0}
              </span>
              <span className="uppercase sm:text-[14px] block font-semibold sm:font-bold sm:mt-2 dark:text-yellow-100 ">
                {" "}
                Total Return Vat
              </span>
            </Tooltip>
          </div>
        </div>
      </section>
    </Fragment>
  );
};

export default ReturnDashboard;
