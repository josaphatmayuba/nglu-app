import { Tooltip } from "antd";
import { BiCartAdd, BiCartDownload } from "react-icons/bi";
import { FaMoneyBills } from "react-icons/fa6";
import { abbreviateNumber } from "../../../utils/nFormetter";
import useCurrency from "../../../utils/useCurrency";

const NewDashboardCard = ({ information }) => {
  const currency = useCurrency();
  return (
    <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-5 mb-5">
      <div className="ant-shadow w-full relative sm:p-2 dark:bg-[#2e2d35] flex sm:justify-center items-center md:p-6 p-2 bg-white rounded-lg dashboard-card-bg">
        <div className="sm:hidden inline-flex flex-shrink-0 items-center justify-center h-14 w-14 text-blue-600 bg-blue-100 rounded-lg mr-6">
          <BiCartDownload size={30} />
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
                {information?.totalSaleAmount?.toFixed(3)}
              </span>
            }
          >
            <span className="block text-blue-600  text-2xl sm:text-3xl font-bold sm:text-center">
              {" "}
              <span
                dangerouslySetInnerHTML={{
                  __html: currency?.currencySymbol,
                }}
              />
              {information?.totalSaleAmount
                ? abbreviateNumber(Number(information?.totalSaleAmount))
                : 0}
            </span>
            <span className="uppercase sm:text-[14px] block font-semibold sm:font-bold sm:mt-2  dark:text-yellow-100 ">
              Total Sales{" "}
              <span className="text-blue-600">
                #
                {information?.totalSaleInvoice
                  ? abbreviateNumber(information?.totalSaleInvoice)
                  : 0}
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
                {information?.totalSaleDue?.toFixed(3)}
              </span>
            }
          >
            <span className="block text-violet-500 text-2xl sm:text-3xl font-bold sm:text-center">
              <span
                dangerouslySetInnerHTML={{
                  __html: currency?.currencySymbol,
                }}
              />
              {information?.totalSaleDue
                ? abbreviateNumber(Number(information?.totalSaleDue))
                : 0}
            </span>

            <span className="uppercase sm:text-[14px] block font-semibold sm:font-bold sm:mt-2  dark:text-yellow-100 ">
              Total Sale Due{" "}
            </span>
          </Tooltip>
        </div>
      </div>
      <div className="ant-shadow w-full relative sm:p-2 dark:bg-[#2e2d35] flex sm:justify-center items-center md:p-6 p-2 bg-white rounded-lg dashboard-card-bg">
        <div className="sm:hidden inline-flex flex-shrink-0 items-center justify-center h-14 w-14  text-blue-600 bg-blue-100 rounded-lg mr-6">
          <BiCartAdd size={30} />
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
                {information?.totalPurchaseAmount?.toFixed(3)}
              </span>
            }
          >
            <span className="block text-blue-600 text-2xl sm:text-3xl font-bold sm:text-center">
              <span
                dangerouslySetInnerHTML={{
                  __html: currency?.currencySymbol,
                }}
              />
              {information?.totalPurchaseAmount
                ? abbreviateNumber(information?.totalPurchaseAmount)
                : 0}
            </span>
            <span className="uppercase sm:text-[14px] block font-semibold sm:font-bold sm:mt-2 dark:text-yellow-100 ">
              {" "}
              Total Purchases{" "}
              <span className="text-blue-600">
                #
                {information?.totalPurchaseInvoice
                  ? abbreviateNumber(information?.totalPurchaseInvoice)
                  : 0}
              </span>
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="ant-shadow w-full relative sm:p-2 dark:bg-[#2e2d35] flex sm:justify-center items-center md:p-6 p-2 bg-white rounded-lg dashboard-card-bg">
        <div className="sm:hidden inline-flex flex-shrink-0 items-center justify-center h-14 w-14 text-violet-600 bg-violet-100 rounded-lg mr-6">
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
                {information?.totalPurchaseDue?.toFixed(3)}
              </span>
            }
          >
            <span className="block text-violet-600 text-2xl sm:text-3xl font-bold sm:text-center">
              <span
                dangerouslySetInnerHTML={{
                  __html: currency?.currencySymbol,
                }}
              />
              {information?.totalPurchaseDue
                ? abbreviateNumber(information?.totalPurchaseDue)
                : 0}
            </span>
            <span className="uppercase sm:text-[14px] block font-semibold sm:font-bold sm:mt-2 dark:text-yellow-100 ">
              {" "}
              Total Purchase Due
            </span>
          </Tooltip>
        </div>
      </div>
    </section>
  );
};

export default NewDashboardCard;
