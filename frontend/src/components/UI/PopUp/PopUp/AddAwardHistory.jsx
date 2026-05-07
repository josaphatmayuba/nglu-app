import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Typography,
} from "antd";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { loadAllAward } from "../../../../redux/rtk/features/award/awardSlice";
import { addAwardHistory } from "../../../../redux/rtk/features/awardHistory/awardHistorySlice";
import { loadSingleStaff } from "../../../../redux/rtk/features/user/userSlice";
import UserPrivateComponent from "../../../PrivacyComponent/UserPrivateComponent";

const AddAwardHistory = ({ setLoading }) => {
  const { id } = useParams("id");
  const { list: award } = useSelector((state) => state.award);
  const [loader, setLoader] = useState();
  const dispatch = useDispatch();

  const { Title } = Typography;
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);
    setLoader(true);
    const FormData = {
      ...values,
      userId: parseInt(id),
    };

    const resp = await dispatch(addAwardHistory(FormData));

    if (resp.payload.message === "success") {
      setLoading(false);
      form.resetFields();
      setLoader(false);
      dispatch(loadSingleStaff(id));
    } else {
      setLoading(false);
      setLoader(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    toast.error("Failed at adding award");

    setLoading(false);
  };

  useEffect(() => {
    dispatch(loadAllAward());
  }, [dispatch]);
  return (
    <>
      <UserPrivateComponent permission={"create-awardHistory"}>
        <Row className='mt-[25px]' justify='center'>
          <Col
            xs={24}
            sm={24}
            md={24}
            lg={24}
            xl={24}
            className='column-design border rounded card-custom'
          >
            <Title level={4} className='m-2 mt-5 mb-5 text-center'>
              Add Award History
            </Title>
            <Form
              form={form}
              style={{ marginBottom: "50px" }}
              eventKey='department-form'
              name='basic'
              labelCol={{
                span: 7,
              }}
              wrapperCol={{
                span: 12,
              }}
              onFinish={onFinish}
              onFinishFailed={onFinishFailed}
              autoComplete='off'
            >
              <div>
                <Form.Item
                  style={{ marginBottom: "10px" }}
                  label='Award Name'
                  name='awardId'
                  rules={[{ required: true }]}
                >
                  <Select placeholder='Select award' loading={!award}>
                    {award &&
                      award.map((award) => (
                        <Select.Option key={award.id} value={award.id}>
                          {award.name}
                        </Select.Option>
                      ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  style={{ marginBottom: "10px" }}
                  label='Awarded Date'
                  name='awardedDate'
                  rules={[
                    {
                      required: true,
                      message: "Please input your awarded Date!",
                    },
                  ]}
                >
                  <DatePicker />
                </Form.Item>

                <Form.Item
                  style={{ marginBottom: "20px" }}
                  label='Comment'
                  name='comment'
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  style={{ marginBottom: "10px" }}
                  wrapperCol={{
                    offset: 7,
                    span: 12,
                  }}
                >
                  <Button
                    type='primary'
                    size='small'
                    htmlType='submit'
                    block
                    loading={loader}
                  >
                    Add New Award
                  </Button>
                </Form.Item>
              </div>
            </Form>
          </Col>
        </Row>
      </UserPrivateComponent>
      <hr />
    </>
  );
};

export default AddAwardHistory;
