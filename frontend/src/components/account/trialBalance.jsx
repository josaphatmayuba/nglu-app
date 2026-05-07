import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadTrailBalance } from "../../redux/rtk/features/account/accountSlice";
import Card from "../../UI/Card"; // Import the custom Card component

const TrialBalance = () => {
  const dispatch = useDispatch();
  const { trailBalance: data, loading } =
    useSelector((state) => state?.accounts) || [];
  //make a use effect to get the data from the getTrailBalance function
  useEffect(() => {
    dispatch(loadTrailBalance());
  }, [dispatch]);

  // Handle loading state separately since custom Card doesn't support loading prop
  if (loading) {
    return (
      <Card title="Trial Balance">
        <div className="flex justify-center items-center p-4">Loading...</div>
      </Card>
    );
  }

  return (
    <Card
      title="Trial Balance"
      className="w-full"
      bodyClass="p-4 overflow-x-auto" // Added overflow-x-auto for mobile horizontal scroll
    >
      <div className='border-gray-200 w-full rounded bg-white overflow-x-auto'>
        <table className='table report-section-table w-full text-sm sm:text-base'> {/* Added responsive text sizes */}
          <thead className='font-Popins text-black/70 bg-tableHeaderBg border-gray-200'>
            <tr className='border-b border-gray'>
              <th
                scope='col'
                className='py-2 sm:py-[14px] pl-2 sm:pl-3 text-left whitespace-nowrap tracking-wide' // Adjusted padding for mobile
              >
                Account
              </th>
              <th
                scope='col'
                className='py-2 sm:py-[14px] pl-2 sm:pl-3 text-left whitespace-nowrap tracking-wide'
              >
                Debit
              </th>
              <th
                scope='col'
                className='py-2 sm:py-[14px] pl-2 sm:pl-3 text-left whitespace-nowrap tracking-wide'
              >
                Credit
              </th>
            </tr>
          </thead>
          <tbody className='bg-tableBg'>
            {data &&
              data?.debits?.map((item, index) => {
                return (
                  <tr
                    key={index}
                    className='hover:bg-slate-900/10 border-b'
                  >
                    <td className='py-1 sm:py-2 pl-2 sm:pl-3 whitespace-nowrap text-xs sm:text-sm'> {/* Adjusted padding and text size */}
                      {item.subAccount}
                    </td>
                    <td className='py-1 sm:py-2 pl-2 sm:pl-3 whitespace-nowrap text-xs sm:text-sm'>
                      {item.balance ? Number(item.balance).toFixed(3) : ""}
                    </td>
                    <td className='py-1 sm:py-2 pl-2 sm:pl-3 whitespace-nowrap text-xs sm:text-sm'></td>
                  </tr>
                );
              })}
            {data &&
              data?.credits?.map((item, index) => {
                return (
                  <tr
                    key={index}
                    className='hover:bg-slate-900/10 border-b'
                  >
                    <td className='py-1 sm:py-2 pl-2 sm:pl-3 whitespace-nowrap text-xs sm:text-sm'>
                      {item.subAccount}
                    </td>
                    <td className='py-1 sm:py-2 pl-2 sm:pl-3 whitespace-nowrap text-xs sm:text-sm'></td>
                    <td className='py-1 sm:py-2 pl-2 sm:pl-3 whitespace-nowrap text-xs sm:text-sm'>
                      {item.balance ? Number(item.balance).toFixed(3) : ""}
                    </td>
                  </tr>
                );
              })}

            <tr className='hover:bg-gray-100 hover:cursor-pointer font-semibold'>
              <td className='py-2 sm:py-4 px-2 sm:px-6 border-b border-gray-200 text-gray-900 text-xs sm:text-sm'> {/* Adjusted padding and text size */}
                TOTAL
              </td>
              <td className='py-2 sm:py-4 px-2 sm:px-6 border-b border-gray-200 text-gray-900 text-xs sm:text-sm'>
                {data?.totalDebit
                  ? Number(data?.totalDebit).toFixed(3)
                  : "-"}
              </td>
              <td className='py-2 sm:py-4 px-2 sm:px-6 border-b border-gray-200 text-gray-900 text-xs sm:text-sm'>
                {data?.totalCredit
                  ? Number(data?.totalCredit).toFixed(3)
                  : "-"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default TrialBalance;
