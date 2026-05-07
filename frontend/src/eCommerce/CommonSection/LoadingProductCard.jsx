import { Card } from 'antd';
import React from 'react'

export default function LoadingProductCard() {

  return (
    <>
      <Card
        style={
          {
            // minWidth: 200,
          }
        }
        cover={
          <div className="w-full h-[180px] object-cover bg-slate-100 rounded-t-lg"></div>
        }
        bodyStyle={{
          padding: "1px 5px",
          backgroundColor: "white",
          borderEndStartRadius: 0,
          borderEndEndRadius: 0,
        }}
        actions={[<div className=" py-4 bg-slate-100" key="addCart"></div>]}
      >
        <div>
          <h1 className="animate-pulse my-1 py-2 bg-slate-200"></h1>
          <div className="animate-pulse my-1 py-2 bg-slate-200 w-1/2"></div>
          <div className="animate-pulse my-1 py-2 bg-slate-200 w-2/3"></div>
        </div>
      </Card>
    </>
  );
}
