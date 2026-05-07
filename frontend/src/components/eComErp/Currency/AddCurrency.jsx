import { Button, Card, Form, Input, Typography } from "antd";
import { Fragment, useState } from "react";
import { useDispatch } from "react-redux";
import {
  addCurrency,
  loadAllCurrencyPaginated,
} from "../../../redux/rtk/features/eCommerce/currency/currencySlice";
import UploadMany from "../../Card/UploadMany";

export default function AddCurrency() {
  const dispatch = useDispatch();
  const { Title } = Typography;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onClick = () => {
    setLoading(true);
  };

  const onFinish = async (values) => {
    try {
      const resp = await dispatch(addCurrency(values));

      if (resp.payload.message === "success") {
        setLoading(false);
        form.resetFields();
        dispatch(
          loadAllCurrencyPaginated({ status: true, page: 1, count: 10 })
        );
      }
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
          Create Currency
        </Title>
        <Form
          form={form}
          layout="vertical"
          style={{ marginLeft: "40px", marginRight: "40px" }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          labelAlign="left"
        >
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Currency name"
            name={"currencyName"}
            rules={[
              {
                required: true,
                message: "Please input currency name!",
              },
            ]}
          >
            <Input size="small" placeholder="e.g. Dollar" />
          </Form.Item>

          <Form.Item
            label="Symbol"
            required
            name="currencySymbol"
            rules={[
              {
                required: true,
                message: "Please input currency Symbol!",
              },
            ]}
          >
            <Input size="small" placeholder="e.g. $" />
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
              Create Currency
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
            title={"Demo Currency"}
            demoData={[
              ["currencyName", "currencySymbol"],
              ["TAKA", "&#2547;"],
              ["EURO", "&#8364;"],
              ["DOLLAR", "&#36;"],
            ]}
            urlPath={"currency"}
            loadAllThunk={loadAllCurrencyPaginated}
            query={{ page: 1, count: 10, status: true }}
          />
        </Card>
      </div>
    </Fragment>
  );
}
