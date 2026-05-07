import { Button, Card, Form, Input, Select, Typography } from "antd";
import TextArea from "antd/es/input/TextArea";
import React, { useState } from "react";
import { CSVLink } from "react-csv";
import { useDispatch } from "react-redux";
import {
  addCourierMedium,
  loadAllCourierMediumPaginated,
} from "../../../redux/rtk/features/eCommerce/courierMedium/courierMediumSlice";
import UploadMany from "../../Card/UploadMany";
export default function AddCourier() {
  const dispatch = useDispatch();
  const { Title } = Typography;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onClick = () => {
    setLoading(true);
  };

  const onFinish = async (values) => {
    const resp = await dispatch(addCourierMedium(values));

    if (resp.payload.message === "success") {
      form.resetFields();
      dispatch(
        loadAllCourierMediumPaginated({
          page: 1,
          count: 10,
          status: "true",
        })
      );
    }
    setLoading(false);
  };

  const onFinishFailed = () => {
    setLoading(false);
  };

  return (
    <>
      <div className=" h-full">
        <Title level={4} className="m-2 text-center">
          Add Delivery Medium
        </Title>
        <Form
          form={form}
          layout="vertical"
          className="sm:mx-10"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
          labelAlign="left"
        >
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Courier Medium Name"
            name={"courierMediumName"}
            className="w-full"
            rules={[
              {
                required: true,
                message: "Please input courier medium name!",
              },
            ]}
          >
            <Input size="small" placeholder="Courier medium name" />
          </Form.Item>
          <div className="flex justify-between gap-5">
            <Form.Item
              style={{ marginBottom: "10px" }}
              label="Medium Type"
              name={"type"}
              className="w-1/2"
              rules={[
                {
                  required: true,
                  message: "Please select medium!",
                },
              ]}
            >
              <Select placeholder="Select Type">
                <Select.Option key={"courier"} value="courier">
                  Courier
                </Select.Option>
                <Select.Option key={"deliveryBoy"} value="deliveryBoy">
                  Delivery Boy
                </Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              style={{ marginBottom: "10px" }}
              label="Phone "
              name={"phone"}
              className="w-1/2"
              rules={[
                {
                  required: true,
                  message: "Please inter phone!",
                },
              ]}
            >
              <Input size="small" placeholder="e.g. +99999999" />
            </Form.Item>
          </div>

          <Form.Item
            style={{ marginBottom: "10px" }}
            name="email"
            label="E-mail"
            rules={[
              {
                type: "email",
                message: "The input is not valid E-mail!",
              },
              {
                required: true,
                message: "Please input your E-mail!",
              },
            ]}
          >
            <Input placeholder="user@gmail.com" />
          </Form.Item>
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Address "
            name={"address"}
            rules={[
              {
                required: true,
                message: "Please inter address!",
              },
            ]}
          >
            <TextArea
              autoSize={{ minRows: 2, maxRows: 6 }}
              size="small"
              placeholder="e.g. Home No / Street / Area"
            />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            className="flex justify-center mt-[24px]"
          >
            <Button
              loading={loading}
              type="primary"
              htmlType="submit"
              shape="round"
              onClick={onClick}
            >
              Create Delivery Medium
            </Button>
          </Form.Item>
        </Form>

        {/* <Card
          title={<span className='text-center font-bold'>Import From CSV</span>}
          className='mt-5'
          extra={
            <div className='flex'>
              <CSVLink
                className=' text-white bg-black/80 text-xs  md:text-base text-center px-0 py-1 rounded w-[200px]'
                filename={"sample courier medium"}
                data={[
                  {
                    courierMediumName: "abc",
                    address: "dhaka",
                    phone: "2154",
                    email: "abc@gmail.com",
                    type: "courier",
                  },
                  {
                    courierMediumName: "abb",
                    address: "dhaka",
                    phone: "87689",
                    email: "abb@gmail.com",
                    type: "courier",
                  },
                  {
                    courierMediumName: "Jhon",
                    address: "dhaka",
                    phone: "97462",
                    email: "aba@gmail.com",
                    type: "deliveryBoy",
                  },
                ]}
              >
                Download Sample CSV
              </CSVLink>
            </div>
          }
        >
          <Title level={4} className='m-2 text-center'>
            Import From CSV
          </Title>
          <UploadMany
            urlPath={"courier"}
            loadAllThunk={loadAllCourierMediumPaginated}
            query={{ page: 1, count: 10, status: true }}
          />
        </Card> */}
      </div>
    </>
  );
}
