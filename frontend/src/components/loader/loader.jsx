import { Spin } from "antd";
import React from "react";

function Loader(props) {
  return (
    <div className=" h-screen flex justify-center items-center">
      <div className=' flex flex-col justify-center'>
        <Spin size='large' />
        <h5 className="pt-2"> Loading Please Wait ...</h5>
      </div>
    </div>
  );
}

export default Loader;
