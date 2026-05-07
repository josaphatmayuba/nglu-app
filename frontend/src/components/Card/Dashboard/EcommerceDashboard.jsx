import { Tooltip } from "antd";
import React from "react";
import { BiCartAdd, BiCartDownload } from "react-icons/bi";
import { FaMoneyBills } from "react-icons/fa6";
import { abbreviateNumber } from "../../../utils/nFormetter";
import useCurrency from "../../../utils/useCurrency";

export default function ECommerceDashboard({ information }) {
  const currency = useCurrency();
  return (
    <section className='grid sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-5 mb-5'>
      <div className='ant-shadow w-full relative sm:p-2 dark:bg-[#2e2d35] flex sm:justify-center items-center md:p-6 p-2 bg-white rounded-lg dashboard-card-bg'>
        <div className='sm:hidden inline-flex flex-shrink-0 items-center justify-center h-14 w-14 text-blue-600 bg-blue-100 rounded-lg mr-6'>
          <FaMoneyBills size={30} />
        </div>
        <div>
          <Tooltip
            title={
              <span className='text-lg'>
                <span
                  dangerouslySetInnerHTML={{
                    __html: currency?.currencySymbol,
                  }}
                />
                {information?.totalSaleAmount.toFixed(3)}
              </span>
            }
          >
            <span className='block text-blue-600 text-2xl sm:text-3xl font-bold sm:text-center'>
              <span
                dangerouslySetInnerHTML={{
                  __html: currency?.currencySymbol,
                }}
              />
              {information?.totalSaleAmount
                ? abbreviateNumber(information?.totalSaleAmount)
                : 0}
            </span>
            <span className='uppercase sm:text-[14px] block font-semibold sm:font-bold sm:mt-2 dark:text-yellow-100 '>
              {" "}
              Total Sale Amount
            </span>
          </Tooltip>
        </div>
      </div>
      <div className='ant-shadow w-full relative sm:p-2 dark:bg-[#2e2d35] flex sm:justify-center items-center md:p-6 p-2 bg-white rounded-lg dashboard-card-bg'>
        <div className='sm:hidden inline-flex flex-shrink-0 items-center justify-center h-14 w-14 text-violet-600 bg-violet-100 rounded-lg mr-6'>
          <BiCartDownload size={30} />
        </div>

        <div>
          <Tooltip
            title={<span className='text-lg'>Total sale invoice count</span>}
          >
            <span className='block text-violet-600 text-2xl sm:text-3xl font-bold sm:text-center'>
              #{" "}
              {information?.totalOrder
                ? abbreviateNumber(Number(information?.totalOrder))
                : 0}
            </span>
            <span className='uppercase sm:text-[14px] block font-semibold sm:font-bold sm:mt-2  dark:text-yellow-100 '>
              Total Order
            </span>
          </Tooltip>
        </div>
      </div>

      <div className='ant-shadow w-full relative sm:p-2 dark:bg-[#2e2d35] flex sm:justify-center items-center md:p-6 p-2 bg-white rounded-lg dashboard-card-bg'>
        <div className='sm:hidden inline-flex flex-shrink-0 items-center justify-center h-14 w-14 text-violet-500 bg-violet-100 rounded-lg mr-6'>
          <FaMoneyBills size={30} />
        </div>
        <div>
          <Tooltip
            title={<span className='text-lg'>Total pending invoice count</span>}
          >
            <span className='block text-violet-500 text-2xl sm:text-3xl font-bold sm:text-center'>
              #{" "}
              {information?.totalPendingOrder
                ? abbreviateNumber(Number(information.totalPendingOrder))
                : 0}
            </span>

            <span className='uppercase sm:text-[14px] block font-semibold sm:font-bold sm:mt-2  dark:text-yellow-100 '>
              Total Pending Order{" "}
            </span>
          </Tooltip>
        </div>
      </div>
      <div className='ant-shadow w-full relative sm:p-2 dark:bg-[#2e2d35] flex sm:justify-center items-center md:p-6 p-2 bg-white rounded-lg dashboard-card-bg'>
        <div className='sm:hidden inline-flex flex-shrink-0 items-center justify-center h-14 w-14 text-blue-600 bg-blue-100 rounded-lg mr-6'>
          <BiCartAdd size={30} />
        </div>
        <div>
          <Tooltip
            title={
              <span className='text-lg'>Total received invoice count</span>
            }
          >
            <span className='block text-blue-600 text-2xl sm:text-3xl font-bold sm:text-center'>
              #{" "}
              {information?.totalReceivedOrder
                ? abbreviateNumber(information?.totalReceivedOrder)
                : 0}
            </span>
            <span className='uppercase sm:text-[14px] block font-semibold sm:font-bold sm:mt-2 dark:text-yellow-100 '>
              {" "}
              Total Received Order
            </span>
          </Tooltip>
        </div>
      </div>
    </section>
  );
}
