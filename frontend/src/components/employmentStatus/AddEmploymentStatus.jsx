import { Button, Card, ColorPicker, Form, Input, Table } from "antd";
import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  addEmployeeStatus,
  loadAllEmployeeStatus,
} from "../../redux/rtk/features/employeeStatus/employeeStatusSlice";
// import { HexColorPicker } from "react-colorful";

export default function AddEmploymentStatus() {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [loader, setLoader] = useState(false);
  const [colorCode, setColorCode] = useState("#1677FF");

  const onFinish = async (values) => {
    const FormData = {
      ...values,
      colourValue: colorCode ? colorCode : "",
    };

    setLoader(true);
    const resp = await dispatch(addEmployeeStatus(FormData));

    if (resp.payload.message === "success") {
      setLoader(false);
      form.resetFields();
      dispatch(loadAllEmployeeStatus());
    } else {
      setLoader(false);
    }
  };

  const onFinishFailed = () => {
    setLoader(false);
  };

  return (
    <div className="sm:mx-10">
      <Form
        form={form}
        style={{ marginTop: "40px" }}
        name="basic"
        layout="vertical"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off">
        <div className="flex gap-3 justify-between">
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Name"
            name="name"
            className="w-full"
            rules={[
              {
                required: true,
                message: "Please input your Employment Status Name!",
              },
            ]}>
            <Input placeholder="Permanent" />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Color Code"
            required>
            <ColorPicker
              showText
              format="hex"
              onChange={(code) => {
                setColorCode(code.toHexString());
              }}
              presets={[
                {
                  // label: "Recommended",
                  colors: [
                    "#000000",
                    "#000000E0",
                    "#000000A6",
                    "#00000073",
                    "#00000040",
                    "#00000026",
                    "#0000001A",
                    "#00000012",
                    "#0000000A",
                    "#00000005",
                    "#F5222D",
                    "#FA8C16",
                    "#FADB14",
                    "#8BBB11",
                    "#52C41A",
                    "#13A8A8",
                    "#1677FF",
                    "#2F54EB",
                    "#722ED1",
                    "#EB2F96",
                    "#F5222D4D",
                    "#FA8C164D",
                    "#FADB144D",
                    "#8BBB114D",
                    "#52C41A4D",
                    "#13A8A84D",
                    "#1677FF4D",
                    "#2F54EB4D",
                    "#722ED14D",
                    "#EB2F964D",
                  ],
                },
                {
                  label: "Recent",
                  colors: [],
                },
              ]}
            />
          </Form.Item>
        </div>
        <Form.Item
          style={{ marginBottom: "20px" }}
          label="Description"
          name={"description"}>
          <Input.TextArea placeholder="Description" />
        </Form.Item>

        <Form.Item style={{ marginBottom: "10px" }}>
          <Button
            onClick={() => setLoader(true)}
            type="primary"
            size="large"
            block
            htmlType="submit"
            loading={loader}>
            Create Employment Status
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
