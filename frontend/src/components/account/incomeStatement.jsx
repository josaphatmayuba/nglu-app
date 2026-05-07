import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadIncomeStatement } from "../../redux/rtk/features/account/accountSlice";
import Card from "../../UI/Card"; // Use custom Card component instead of Antd

const IncomeStatement = () => {
  const dispatch = useDispatch();
  const { incomeStatement: data, loading } =
    useSelector((state) => state?.accounts) || null;

  useEffect(() => {
    dispatch(loadIncomeStatement());
  }, [dispatch]);

  // Handle loading state separately since custom Card doesn't support loading prop
  if (loading) {
    return (
      <Card title="Income Statement">
        <div className="flex justify-center items-center p-4">Loading...</div>
      </Card>
    );
  }

  return (
    <Card
      title="Income Statement"
      className="w-full shadow-lg" // Added shadow for a more polished look
      bodyClass="p-4 overflow-x-auto" // Added overflow-x-auto for mobile horizontal scroll
    >
      <div className="w-full bg-white rounded-lg overflow-x-auto">
        {/* Revenue Section */}
        <div className="mb-6">
          <h5 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">
            Revenue
          </h5>
          <table className="table report-section-table w-full text-sm sm:text-base border-collapse min-w-[600px]"> {/* Added min-width for better mobile scrolling */}
            <thead className="bg-gray-900 text-black font-bold uppercase tracking-wide">
              <tr className="border-b border-gray-300">
                <th className="py-3 px-4 text-left">Account</th>
                <th className="py-3 px-4 text-left">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-gray-50">
              {data &&
                data?.revenue.map((item, index) => (
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
                  {data?.totalRevenue ? Number(data.totalRevenue).toFixed(3) : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Expense Section */}
        <div className="mb-6">
          <h5 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">
            Expense
          </h5>
          <table className="table report-section-table w-full text-sm sm:text-base border-collapse min-w-[600px]"> {/* Added min-width for better mobile scrolling */}
            <thead className="bg-gray-900 text-black font-bold uppercase tracking-wide">
              <tr className="border-b border-gray-300">
                <th className="py-3 px-4 text-left">Account</th>
                <th className="py-3 px-4 text-left">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-gray-50">
              {data &&
                data?.expense.map((item, index) => (
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
                  {data?.totalExpense ? Number(data.totalExpense).toFixed(3) : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Profit Section */}
        <div className="mb-6">
          <h5 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">
            Profit
          </h5>
          <table className="table report-section-table w-full text-sm sm:text-base border-collapse min-w-[600px]"> {/* Added min-width for better mobile scrolling */}
            <thead className="bg-gray-900 text-black font-bold uppercase tracking-wide">
              <tr className="border-b border-gray-300">
                <th className="py-3 px-4 text-left">Account</th>
                <th className="py-3 px-4 text-left">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-gray-50">
              <tr className="bg-blue-50 font-bold">
                <td className="py-3 px-4 border-b border-gray-300 text-gray-900 text-xs sm:text-sm">
                  Total
                </td>
                <td className="py-3 px-4 border-b border-gray-300 text-gray-900 text-xs sm:text-sm">
                  {data?.profit ? Number(data.profit).toFixed(3) : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

export default IncomeStatement;
