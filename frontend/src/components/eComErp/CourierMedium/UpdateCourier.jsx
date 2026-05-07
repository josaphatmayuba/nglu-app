import { EditOutlined } from "@ant-design/icons";
import { Button, Form, Input, InputNumber, Modal, Select } from "antd";
import TextArea from "antd/es/input/TextArea";
import Title from "antd/es/skeleton/Title";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateCourierMedium } from "../../../redux/rtk/features/eCommerce/courierMedium/courierMediumSlice";

export default function UpdateCourier({ data }) {
  const dispatch = useDispatch();
  const { edit } = useSelector((state) => state.courierMedium);
  const [form] = Form.useForm();
  const [loader, setLoader] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [initValues, setInitValues] = useState({
    courierMediumName: data.courierMediumName,
    phone: data.phone,
    type: data.type,
    email: data.email,
    address: data.address,
  });

  const onFinish = async (values) => {
    setLoader(true);

    const resp = await dispatch(
      updateCourierMedium({ id: data.id, values: values })
    );
    if (resp.payload.message == "success") {
      setIsModalOpen(false);
      setLoader(false);
    }
  };

  const onFinishFailed = () => {
    setLoader(false);
  };

  return (
    <>
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => {
          setIsModalOpen(true);
        }}
      >
        <EditOutlined className=" rounded-md" />
        Edit
      </div>
      <Modal
        title="Update Courier"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={false}
      >
        <Title level={4} className="m-2 text-center">
          Add Courier
        </Title>
        <Form
          form={form}
          layout="vertical"
          initialValues={initValues}
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
            rules={[
              {
                required: true,
                message: "Please input courier medium name!",
              },
            ]}
          >
            <Input size="small" placeholder="pathao" />
          </Form.Item>

          <div className="flex justify-between gap-5">
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
              <InputNumber size="small" placeholder="e.g. +99999999" />
            </Form.Item>

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
              loading={loader}
              type="primary"
              htmlType="submit"
              shape="round"
            >
              Update Courier
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
