import React, { Fragment } from "react";
import {
	MdOutlineAccountBalance,
	MdOutlineAttachMoney,
	MdOutlineMoneyOffCsred,
} from "react-icons/md";
import { abbreviateNumber } from "../../utils/nFormetter";
import { Tooltip } from "antd";

const VatStatementCards = ({ information }) => {
	return (
    <Fragment>
      <section className="grid  grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-5 mb-5">
        <div className="ant-shadow w-full relative sm:p-2 dark:bg-[#2e2d35] flex sm:justify-center items-center md:p-6 p-2 bg-white rounded-lg dashboard-card-bg">
          <div className="sm:hidden inline-flex flex-shrink-0 items-center justify-center h-14 w-14 text-blue-600 bg-blue-100 rounded-lg mr-6">
            <MdOutlineMoneyOffCsred size={30} />
          </div>
          <div>
            <span className="block text-2xl sm:text-[35px] font-bold sm:text-center">
              {" "}
              {information?.totalVatGiven
                ? abbreviateNumber(information?.totalVatGiven)
                : 0}
            </span>
            <span className="block sm:text-lg sm:mt-2 dark:text-yellow-100 text-gray-500">
              {" "}
              Total Asset{" "}
            </span>
          </div>
        </div>

        <div className="ant-shadow w-full relative sm:p-2 dark:bg-[#2e2d35] flex sm:justify-center items-center md:p-6 p-2 bg-white rounded-lg dashboard-card-bg">
          <div className="sm:hidden inline-flex flex-shrink-0 items-center justify-center h-14 w-14 text-violet-600 bg-violet-100 rounded-lg mr-6">
            <MdOutlineAttachMoney size={30} />
          </div>
          <div>
            <Tooltip
              title={
                <span className="text-lg">
                  {information?.totalVatReceived.toFixed(3)}
                </span>
              }
            >
              <span className="block text-2xl sm:text-[35px] font-bold sm:text-center">
                {" "}
                {information?.totalVatReceived
                  ? abbreviateNumber(information?.totalVatReceived)
                  : 0}
              </span>
              <span className="block sm:text-lg sm:mt-2 dark:text-yellow-100 text-gray-500">
                Total Liability
              </span>
            </Tooltip>
          </div>
        </div>
        <div className="ant-shadow w-full relative sm:p-2 dark:bg-[#2e2d35] flex sm:justify-center items-center md:p-6 p-2 bg-white rounded-lg dashboard-card-bg">
          <div className="sm:hidden inline-flex flex-shrink-0 items-center justify-center h-14 w-14 text-rose-500 bg-rose-100 rounded-lg mr-6">
            <MdOutlineAccountBalance size={30} />
          </div>
          <div>
            {" "}
            <Tooltip
              title={
                <span className="text-lg">
                  {information?.totalVat.toFixed(3)}
                </span>
              }
            >
              <span className="block text-2xl sm:text-[35px] font-bold sm:text-center">
                {information?.totalVat
                  ? abbreviateNumber(information?.totalVat)
                  : 0}
              </span>

              <span className="block sm:text-lg sm:mt-2 dark:text-yellow-100 text-gray-500">
                Total Vat Balance{" "}
              </span>
            </Tooltip>
          </div>
        </div>
      </section>
    </Fragment>
  );
};

export default VatStatementCards;
