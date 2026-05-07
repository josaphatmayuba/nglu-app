import Loader from "@/components/loader/loader";
import {
  getSetting,
  updateSetting,
} from "@/redux/rtk/features/setting/settingSlice";
import { Button, Card, Col, Form, Row, Select } from "antd";
import { Fragment } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";

const GeneralSetting = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const { data, loading } = useSelector((state) => state?.setting) || null;

  const onFinish = async (values) => {
    try {
      const data = {
        ...values,
        _method: 'PUT',
      };

      const resp = await dispatch(updateSetting(data));
      if (resp.payload.message === "success") {
        toast.success("Company Updated Successfully");
        dispatch(getSetting());
      }
    } catch (error) {}
  };

  return (
    <Fragment>
      <Row className="mr-top" justify="center">
        <Col
          xs={24}
          sm={24}
          md={24}
          lg={16}
          xl={16}
          className="border rounded column-design">
          <Card bordered={false}>
            {data ? (
              <Form
                initialValues={{
                  ...data,
                }}
                form={form}
                name="basic"
                labelCol={{
                  span: 7,
                }}
                labelWrap
                wrapperCol={{
                  span: 16,
                }}
                onFinish={onFinish}
                autoComplete="off">
                <Form.Item
                  style={{ marginBottom: "10px" }}
                  label="POS"
                  name="isPos"
                  tooltip="Enable this feature to add POS in Application">
                  <Select>
                    <Select.Option value={"true"}>Enable</Select.Option>
                    <Select.Option value={"false"}>Disable</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  style={{ marginBottom: "10px" }}
                  label="Discount"
                  name="isDiscount"
                  tooltip="Enable this feature to allow discounts in transactions">
                  <Select>
                    <Select.Option value={"true"}>Enable</Select.Option>
                    <Select.Option value={"false"}>Disable</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  style={{ marginBottom: "10px" }}
                  label="Tax"
                  name="isTax"
                  tooltip="Enable this feature to apply taxes in transactions">
                  <Select>
                    <Select.Option value={"true"}>Enable</Select.Option>
                    <Select.Option value={"false"}>Disable</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  style={{ marginBottom: "10px" }}
                  className="flex justify-center mt-[24px]">
                  <Button
                    type="primary"
                    disabled={loading}
                    htmlType="submit"
                    shape="round"
                    loading={loading}>
                    Save
                  </Button>
                </Form.Item>
              </Form>
            ) : (
              <Loader />
            )}
          </Card>
        </Col>
      </Row>
    </Fragment>
  );
};

export default GeneralSetting;
