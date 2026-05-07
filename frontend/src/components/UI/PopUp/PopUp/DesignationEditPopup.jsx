import { Modal } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadAllDesignation } from "../../../../redux/rtk/features/designation/designationSlice";
import Loader from "../../../loader/loader";
import BtnEditSvg from "../../Button/btnEditSvg";
import EmployeeDesignation from "../../EmployeeDesignation";
import DesignationAddSinglePopup from "./DesignationAddSinglePopup";

const DesignationEditPopup = ({ data }) => {
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { list } = useSelector((state) => state.designations);

  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleOk = () => {
    setIsModalOpen(false);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };
  useEffect(() => {
    dispatch(loadAllDesignation({}));
  }, [dispatch]);
  return (
    <>
      <button onClick={showModal} className='mt-4 mr-2'>
        <BtnEditSvg size={25} />
      </button>
      <Modal
        title='Edit Designation'
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        {!loading ? (
          <>
            <EmployeeDesignation
              list={data}
              edit={true}
              setLoading={setLoading}
            />
            <DesignationAddSinglePopup list={list} setLoading={setLoading} />
          </>
        ) : (
          <Loader />
        )}
      </Modal>
    </>
  );
};
export default DesignationEditPopup;
