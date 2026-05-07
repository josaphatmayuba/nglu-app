import { Drawer } from "antd";
import React, { useState } from "react";
import { BiCategory } from "react-icons/bi";
import { IoMdClose } from "react-icons/io";
import FooterMenu from "./FooterMenu";
const MenuDrawer = () => {
  const [open, setOpen] = useState(false);

  const showDrawer = () => {
    setOpen(true);
  };
  const onClose = () => {
    setOpen(false);
  };

  return (
    <>
      <div className="cursor-pointer" onClick={showDrawer}>
        <BiCategory size={25} className="text-white" />
      </div>
      <Drawer
        title={<span className="">Categories</span>}
        placement="left"
        closable={false}
        onClose={onClose}
        open={open}
        width={"100%"}
        className="menuDrawer"
        style={{ position: "absolute", bottom: "60px" }}
        extra={
          <div
            className="bg-slate-50 text-gray-500 cursor-pointer p-2 rounded-full hover:bg-red-50 hover:text-red-500 duration-150"
            onClick={onClose}
          >
            <IoMdClose size={20} />
          </div>
        }
      >
        <FooterMenu onClose={onClose} />
      </Drawer>
    </>
  );
};
export default MenuDrawer;
