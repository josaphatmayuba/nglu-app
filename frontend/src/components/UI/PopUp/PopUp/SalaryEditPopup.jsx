import { Modal } from "antd";
import { useState } from "react";
import Loader from "../../../loader/loader";
import BtnEditSvg from "../../Button/btnEditSvg";
import EmployeeSalary from "../../EmployeeSalary";
import SalaryAddSinglePopup from "./SalaryAddPopup";

const SalaryEditPopup = ({ data }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleOk = () => {
    setIsModalOpen(false);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };
  return (
    <>
      <button onClick={showModal} className='mt-4 mr-2'>
        <BtnEditSvg size={25} />
      </button>
      <Modal
        title='Edit Salary'
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        {!loading ? (
          <>
            <EmployeeSalary list={data} edit={true} setLoading={setLoading} />
            <SalaryAddSinglePopup setLoading={setLoading} />
          </>
        ) : (
          <Loader />
        )}
      </Modal>
    </>
  );
};
export default SalaryEditPopup;
