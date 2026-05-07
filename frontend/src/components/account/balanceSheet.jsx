import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadBalanceSheet } from "../../redux/rtk/features/account/accountSlice";
import Card from "../../UI/Card"; // Use custom Card component instead of Antd

const BalanceSheet = () => {
  const dispatch = useDispatch();
  const { balanceSheet: data, loading } =
    useSelector((state) => state?.accounts) || null;
  useEffect(() => {
    dispatch(loadBalanceSheet());
  }, [dispatch]);

  // Handle loading state separately since custom Card doesn't support loading prop
  if (loading) {
    return (
      <Card title="Balance Sheet">
        <div className="flex justify-center items-center p-4">Loading...</div>
      </Card>
    );
  }

  return (
    <Card
      title="Balance Sheet"
      className="w-full shadow-lg" // Added shadow for a more polished look
      bodyClass="p-4 overflow-x-auto" // Added overflow-x-auto for mobile horizontal scroll
    >
      <div className="w-full bg-white rounded-lg overflow-x-auto">
        {/* Assets Section */}
        <div className="mb-6">
          <h5 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">
            Assets
          </h5>
          <table className="table report-section-table w-full text-sm sm:text-base border-collapse">
            <thead className="bg-gray-900 text-black font-bold uppercase tracking-wide">
              <tr className="border-b border-gray-300">
                <th className="py-3 px-4 text-left">Account</th>
                <th className="py-3 px-4 text-left">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-gray-50">
              {data &&
                data?.assets.map((item, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-100 transition-colors duration-200"
                  >
                    <td className="py-2 px-4 border-b border-gray-200 text-gray-900 text-xs sm:text-sm">
                      {item.subAccount}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200 text-gray-900 text-xs sm:text-sm">
                      {item.balance ? Number(item.balance).toFixed(3) : ""}
                    </td>
                  </tr>
                ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="py-3 px-4 border-b border-gray-300 text-gray-900 text-xs sm:text-sm">
                  TOTAL
                </td>
                <td className="py-3 px-4 border-b border-gray-300 text-gray-900 text-xs sm:text-sm">
                  {data?.totalAsset ? Number(data.totalAsset).toFixed(3) : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Liabilities Section */}
        <div className="mb-6">
          <h5 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">
            Liabilities
          </h5>
          <table className="table report-section-table w-full text-sm sm:text-base border-collapse">
            <thead className="bg-gray-900 text-black font-bold uppercase tracking-wide">
              <tr className="border-b border-gray-300">
                <th className="py-3 px-4 text-left">Account</th>
                <th className="py-3 px-4 text-left">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-gray-50">
              {data &&
                data?.liabilities.map((item, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-100 transition-colors duration-200"
                  >
                    <td className="py-2 px-4 border-b border-gray-200 text-gray-900 text-xs sm:text-sm">
                      {item.subAccount}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200 text-gray-900 text-xs sm:text-sm">
                      {item.balance ? Number(item.balance).toFixed(3) : ""}
                    </td>
                  </tr>
                ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="py-3 px-4 border-b border-gray-300 text-gray-900 text-xs sm:text-sm">
                  TOTAL
                </td>
                <td className="py-3 px-4 border-b border-gray-300 text-gray-900 text-xs sm:text-sm">
                  {data?.totalLiability ? Number(data.totalLiability).toFixed(3) : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Equity Section */}
        <div className="mb-6">
          <h5 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">
            Equity
          </h5>
          <table className="table report-section-table w-full text-sm sm:text-base border-collapse">
            <thead className="bg-gray-900 text-black font-bold uppercase tracking-wide">
              <tr className="border-b border-gray-300">
                <th className="py-3 px-4 text-left">Account</th>
                <th className="py-3 px-4 text-left">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-gray-50">
              {data &&
                data?.equity.map((item, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-100 transition-colors duration-200"
                  >
                    <td className="py-2 px-4 border-b border-gray-200 text-gray-900 text-xs sm:text-sm">
                      {item.subAccount}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200 text-gray-900 text-xs sm:text-sm">
                      {item.balance ? Number(item.balance).toFixed(3) : ""}
                    </td>
                  </tr>
                ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="py-3 px-4 border-b border-gray-300 text-gray-900 text-xs sm:text-sm">
                  TOTAL
                </td>
                <td className="py-3 px-4 border-b border-gray-300 text-gray-900 text-xs sm:text-sm">
                  {data?.totalEquity ? Number(data.totalEquity).toFixed(3) : ""}
                </td>
              </tr>
              <tr className="bg-blue-50 font-bold">
                <td className="py-3 px-4 border-b border-gray-300 text-gray-900 text-xs sm:text-sm">
                  Total Liability and Equity
                </td>
                <td className="py-3 px-4 border-b border-gray-300 text-gray-900 text-xs sm:text-sm">
                  {data?.totalEquity && data?.totalLiability
                    ? (Number(data.totalEquity) + Number(data.totalLiability)).toFixed(3)
                    : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

export default BalanceSheet;
