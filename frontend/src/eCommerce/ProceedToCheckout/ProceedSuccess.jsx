import React from "react";
import { useNavigate } from "react-router-dom";
import useQuery from "../../utils/useQuery";
import success from "../../assets/images/success.jpg"
export default function ProceedSuccess() {
  const query = useQuery();
  const orderId = query.get("orderId");
  const navigate = useNavigate();

  const handleTruckOrder = () => {
    navigate(`/order/${orderId}`);
  };
  return (
    <div className="bg-white">
      <div className="container  py-5 md:mt-8 flex flex-col md:flex-row justify-evenly items-center">
        <div className="w-full md:w-[60%] h-[300px] md:h-[500px] relative overflow-hidden md:my-10">
          <img
            className="w-full h-full object-cover absolute "
            src={success}
            alt="success"
            sizes="100vw"
          />
        </div>
        <div className="  flex flex-col items-center justify-center py-5">
          <h1 className="text-[40px] md:text-[50px] font-medium md:mb-5">
            Thank You!
          </h1>

          <div className="flex flex-col items-center md:mt-5">
            <h1 className="text-[22px]">
              Order placed <span className="text-green-500 font-medium">successfully</span>
            </h1>
            <span className="font-medium text-gray-500 text-center inline-block">
              Order Id: {orderId}
            </span>
          </div>
          <div className="my-10">
            <button
              onClick={handleTruckOrder}
              className="bg-ePrimary text-white px-10 py-[10px] rounded-md font-medium"
            >
              Track Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
