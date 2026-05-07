import { Card } from "antd";
import moment from "moment";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import {
  clearAccount,
  loadSingleAccount,
} from "../../redux/rtk/features/account/accountSlice";
import Loader from "../loader/loader";
import UpdateAccount from "./updateAccount";

const DetailAccount = () => {
  const data = useSelector((state) => state.accounts.account);
  const { id } = useParams("id");
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadSingleAccount(id));
    return () => {
      dispatch(clearAccount());
    };
  }, [dispatch, id]);

  return (
    <>
      <Card
        className="shadow-lg rounded-xl p-2 sm:p-6 bg-gradient-to-br from-white via-slate-50 to-slate-100"
        bodyStyle={{ padding: 0 }}
      >
        {data ? (
          <div className="">
            <div className="card-title flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6">
              <h5 className="text-lg sm:text-2xl font-bold text-slate-800 mb-2 sm:mb-0 flex items-center gap-2">
                <span className="inline-block text-blue-700 px-2 sm:px-3 py-1 text-base font-semibold">
                  Account Ledger: {data.name}
                </span>
              </h5>
              <UpdateAccount account={data} id={id} />
            </div>
            <div className="w-full">
              <div className="border border-gray-200 rounded-xl overflow-x-auto bg-white shadow-inner">
                <table className="w-full min-w-[600px] text-xs sm:text-sm text-slate-700">
                  <thead className="font-semibold text-slate-600 bg-gradient-to-r from-blue-50 to-slate-100 border-b border-gray-200 uppercase">
                    <tr>
                      <th className="py-3 sm:py-4 pl-2 sm:pl-4 text-left tracking-wide rounded-tl-xl">
                        Date
                      </th>
                      <th className="py-3 sm:py-4 px-2 sm:px-3 text-left tracking-wide">
                        Debit
                      </th>
                      <th className="py-3 sm:py-4 px-2 sm:px-3 text-left tracking-wide">
                        Credit
                      </th>
                      <th className="py-3 sm:py-4 pr-2 sm:pr-4 text-left tracking-wide rounded-tr-xl">
                        Particulars
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.debit?.map((item, index) => (
                      <tr
                        key={`debit-${index}`}
                        className={`${index % 2 === 0
                          ? "bg-slate-50"
                          : "bg-white"
                          } hover:bg-blue-50 transition`}
                      >
                        <td className="py-2 sm:py-3 pl-2 sm:pl-4 whitespace-nowrap font-medium">
                          {moment(item.date).format("ll")}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-3 whitespace-nowrap text-green-600 font-semibold">
                          {item.amount}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-3 whitespace-nowrap"></td>
                        <td className="py-2 sm:py-3 pr-2 sm:pr-4 whitespace-nowrap">
                          {item.particulars}
                        </td>
                      </tr>
                    ))}
                    {data?.credit?.map((item, index) => (
                      <tr
                        key={`credit-${index}`}
                        className={`${index % 2 === 0
                          ? "bg-slate-50"
                          : "bg-white"
                          } hover:bg-blue-50 transition`}
                      >
                        <td className="py-2 sm:py-3 pl-2 sm:pl-4 whitespace-nowrap font-medium">
                          {moment(item.date).format("ll")}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-3 whitespace-nowrap"></td>
                        <td className="py-2 sm:py-3 px-2 sm:px-3 whitespace-nowrap text-red-600 font-semibold">
                          {item.amount}
                        </td>
                        <td className="py-2 sm:py-3 pr-2 sm:pr-4 whitespace-nowrap">
                          {item.particulars}
                        </td>
                      </tr>
                    ))}
                    {data && (
                      <tr className="bg-gradient-to-r from-blue-100 to-blue-50 border-t-2 border-blue-200">
                        <td
                          colSpan="2"
                          className="py-3 sm:py-4 pl-2 sm:pl-4 font-bold text-base sm:text-lg text-slate-700"
                        >
                          Balance
                        </td>
                        <td className="py-3 sm:py-4 px-2 sm:px-3 font-bold text-base sm:text-lg text-blue-700">
                          {data?.balance.toFixed(2)}
                        </td>
                        <td className="py-3 sm:py-4 pr-2 sm:pr-4"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center min-h-[150px] sm:min-h-[200px]">
            <Loader />
          </div>
        )}
      </Card>
    </>
  );
};

export default DetailAccount;
