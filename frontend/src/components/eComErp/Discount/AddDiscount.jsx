import {
  Button,
  Card,
  DatePicker,
  Form,
  InputNumber,
  Select,
  Typography,
} from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { Fragment, useState } from "react";
import { useDispatch } from "react-redux";
import {
  addDiscount,
  loadAllDiscount,
  loadAllDiscountPaginated,
} from "../../../redux/rtk/features/eCommerce/discount/discountSlice";
import UploadMany from "../../Card/UploadMany";

export default function AddDiscount() {
  const dispatch = useDispatch();
  const { Title } = Typography;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onClick = () => {
    setLoading(true);
  };

  const onFinish = async (values) => {
    const newValues = {
      ...values,
      startDate: moment(values.startDate).format("YYYY-MM-DD"),
      endDate: moment(values.endDate).format("YYYY-MM-DD"),
    };
    try {
      const resp = await dispatch(addDiscount(newValues));

      if (resp.payload.message === "success") {
        form.resetFields();
        dispatch(
          loadAllDiscountPaginated({
            page: 1,
            count: 10,
            status: "true",
          })
        );
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const onFinishFailed = () => {
    setLoading(false);
  };

  return (
    <Fragment>
      <div className=" h-full">
        <Title level={4} className="m-2 text-center">
          Create Discount
        </Title>
        <Form
          form={form}
          layout="vertical"
          className="sm:mx-10"
          initialValues={{
            remember: true,
            startDate: dayjs(),
          }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
          labelAlign="left"
        >
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Value"
            name={"value"}
            rules={[
              {
                required: true,
                message: "Please input coupon value!",
              },
            ]}
          >
            <InputNumber size="small" placeholder="e.g. 15" />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Type"
            name={"type"}
            rules={[
              {
                required: true,
                message: "Please select coupon type!",
              },
            ]}
          >
            <Select placeholder="Select type">
              <Select.Option key={"percentage"}>Percentage</Select.Option>
              <Select.Option key={"flat"}>Flat</Select.Option>
            </Select>
          </Form.Item>

          <div className="flex gap-4">
            <Form.Item
              label="Start Date"
              required
              className="w-1/2"
              name="startDate"
              rules={[
                {
                  required: true,
                  message: "Please input Start Date!",
                },
              ]}
            >
              <DatePicker
                label="StartDate"
                size="medium"
                format={"YYYY-MM-DD"}
              />
            </Form.Item>
            <Form.Item
              label="End Date"
              required
              className="w-1/2"
              name="endDate"
              rules={[
                {
                  required: true,
                  message: "Please input End Date!",
                },
              ]}
            >
              <DatePicker label="endDate" size="medium" format={"YYYY-MM-DD"} />
            </Form.Item>
          </div>

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
              Create Discount
            </Button>
          </Form.Item>
        </Form>

        <Card
          title={<span className="text-center font-bold">Import From CSV</span>}
          className="mt-5"
        >
          <Title level={4} className="m-2 text-center">
            Import From CSV
          </Title>
          <UploadMany
            title={"Demo Discount"}
            demoData={[
              ["value", "type", "startDate", "endDate"],
              ["5", "percentage", "2024-01-01", "2026-01-01"],
              ["10", "flat", "2024-02-02", "2026-02-02"],
              ["15", "percentage", "2024-03-03", "2026-03-03"],
              ["35", "flat", "2024-04-04", "2026-04-04"],
            ]}
            urlPath={"discount"}
            loadAllThunk={loadAllDiscount}
            // query={{ page: 1, count: 10, status: true }}
          />
        </Card>
      </div>
    </Fragment>
  );
}
