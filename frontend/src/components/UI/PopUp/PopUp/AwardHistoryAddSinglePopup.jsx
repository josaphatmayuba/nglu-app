import { Button, Modal } from "antd";
import { useState } from "react";
import AddAwardHistory from "./AddAwardHistory";

const AwardAddSinglePopup = ({ data, setLoading }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      <div className='text-center'>
        <Button type='primary' onClick={showModal}>
          Add New Award
        </Button>
      </div>
      <Modal
        title={`Add award`}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <AddAwardHistory setLoading={setLoading} />
      </Modal>
    </>
  );
};
export default AwardAddSinglePopup;
