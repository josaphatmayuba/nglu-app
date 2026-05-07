import React from "react";
import { FiPlus } from "react-icons/fi";
import AddAddress from "./AddAddress";
import { useState } from "react";
import { Modal } from "antd";
export default function Address() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const showModal = () => {
      setIsModalOpen(true);
    };
    const handleCancel = () => {
      setIsModalOpen(false);
    };
  return (
    <div className="bg-white rounded-lg p-5">
      <div className="flex justify-between items-center mb-10">
        <h3 className="text-lg">Address Book</h3>
        <button onClick={()=>showModal()} className="flex items-center text-white bg-ePrimary py-1 px-2 rounded">
          <FiPlus />
          <span>Add Address</span>
        </button>
      </div>
      <div className="flex flex-col md:flex-row justify-between gap-10 ">
        <div className="flex justify-between items-start border rounded p-5 md:w-1/2 ">
          <div className="text-[14px] leading-8 text-gray-600">
            <p>MD Tanvir</p>
            <p>01741940694</p>
            <p>Dhaka,Dhaka - North,Shewrapara,shapla Sarani</p>
            <div>
              <span className="uppercase font-medium text-white text-[12px] bg-ePrimary px-2 py-[2px] rounded-sm ">
                Office
              </span>
            </div>
          </div>
          <div>
            <button className="text-ePrimary text-[12px] bg-ePrimary/10 px-2 py-[2px] rounded-sm ">
              Edit
            </button>
          </div>
        </div>
        <div className="flex justify-between items-start border rounded p-5 md:w-1/2 ">
          <div className="text-[14px] leading-8 text-gray-600">
            <p>MD Tanvir</p>
            <p>01741940694</p>
            <p>Dhaka,Dhaka - North,Shewrapara,shapla Sarani</p>
            <div>
              <span className="uppercase font-medium text-white text-[12px] bg-ePrimary px-2 py-[2px] rounded-sm ">
                Home
              </span>
            </div>
          </div>
          <div>
            <button className="text-ePrimary text-[12px] bg-ePrimary/10 px-2 py-[2px] rounded-sm ">
              Edit
            </button>
          </div>
        </div>
      </div>

      {/*===================================================
                        Address  modal
      ======================================================*/}
      <Modal
        open={isModalOpen}
        width={800}
        onCancel={handleCancel}
        title={"Add Address"}
        footer={null}
      >
        <AddAddress />
      </Modal>
    </div>
  );
}
