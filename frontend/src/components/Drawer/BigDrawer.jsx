import { PlusOutlined } from "@ant-design/icons";
import { Drawer, Layout } from "antd";
import { useState } from "react";

const BigDrawer = ({ children, btnTitle, title, className }) => {
  const { Content } = Layout;
  const [open, setOpen] = useState(false);
  const showDrawer = () => {
    setOpen(true);
  };
  const onClose = () => {
    setOpen(false);
  };
  return (
    <>
      <button
        className={`mx-1 flex justify-center items-center bg-[#4F46E5] hover:bg-[#4F46E5] rounded p-1 gap-1 text-white ${
          className ? className : ""
        }`}
        type='button'
        onClick={showDrawer}
      >
        <PlusOutlined className='text-[10px] flex items-center' />
        {btnTitle}
      </button>
      <Drawer
        title={`Create a ${title}`}
        width={"40%"}
        onClose={onClose}
        open={open}
        bodyStyle={{
          paddingBottom: 80,
        }}
      >
        <Content>{children}</Content>
      </Drawer>
    </>
  );
};
export default BigDrawer;
