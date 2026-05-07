import { Modal } from "antd";
import { useState } from "react";
import Loader from "../../../loader/loader";
import BtnEditSvg from "../../Button/btnEditSvg";
import EmployeeAward from "../../EmployeeAward";
import AwardAddSinglePopup from "./AwardHistoryAddSinglePopup";

const AwardHistoryEditPopup = ({ data }) => {
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
        title='Edit Award'
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        {!loading ? (
          <>
            <EmployeeAward list={data} edit={true} setLoading={setLoading} />
            <AwardAddSinglePopup setLoading={setLoading} />
          </>
        ) : (
          <Loader />
        )}
      </Modal>
    </>
  );
};
export default AwardHistoryEditPopup;
