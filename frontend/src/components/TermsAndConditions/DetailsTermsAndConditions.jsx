import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../../UI/Card";
import {
  deleteTermsAndConditions,
  editTermsAndCondition,
  loadAllTermsAndConditions,
  loadSingleTermsAndConditions,
  updateTermsAndConditions,
} from "../../redux/rtk/features/termsAndCondition/termsAndConditionSlice";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";

export default function DetailsTermsAndConditions() {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loader, setLoader] = useState();
  const { TextArea } = Input;
  const { id } = useParams("id");
  const navigate = useNavigate();
  const [openToEdit, setOpenToEdit] = useState(false);
  const { termsAndConditions, loading } = useSelector(
    (state) => state.termsAndConditions
  );
  // delete termsAndConditions
  const onDelete = async (id) => {
    const res = await dispatch(deleteTermsAndConditions(id));
    if (res) {
      dispatch(loadAllTermsAndConditions());
      navigate(-1);
    }
  };
  const [TermsAndConditions, setTermsAndConditions] = useState("");
  const handleText = (e) => {
    e.preventDefault();
    setTermsAndConditions(e.target.value);
  };
  const handleTextareaKeyDown = (e) => {
    if (e.key === "Enter") {
      setTermsAndConditions(termsAndConditions + "\n");
    }
  };

  // update termsAndConditions
  const onFinish = async (values) => {
    await dispatch(
      updateTermsAndConditions({
        id,
        values: { title: values.title, subject: TermsAndConditions },
      })
    );
    setLoader(false);
    dispatch(loadSingleTermsAndConditions(id));
    setOpenToEdit(false);
  };

  const onFinishFailed = () => {
    setLoader(false);
  };

  const formattedText = termsAndConditions?.subject?.replace(/\n/g, "<br/>");
  // update form filed
  useEffect(() => {
    form.setFieldValue("subject", termsAndConditions?.subject);
    form.setFieldValue("title", termsAndConditions?.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termsAndConditions]);

  // load single termsAndConditions
  useEffect(() => {
    dispatch(loadSingleTermsAndConditions(id));
  }, [dispatch, id]);
  return (
    <>
      {!openToEdit && (
        <Card
          title={<> {termsAndConditions?.title} </>}
          extra={
            <div className='flex items-center gap-3'>
              <UserPrivateComponent permission={"update-termsAndCondition"}>
                <EditOutlined
                  onClick={() => setOpenToEdit(true)}
                  className='bg-gray-600 p-2 text-white rounded-md'
                  style={{ fontSize: "15px" }}
                />
              </UserPrivateComponent>
              <UserPrivateComponent permission={"delete-termsAndCondition"}>
                <DeleteOutlined
                  onClick={() => onDelete(id)}
                  className='bg-red-600 p-[10px] text-white rounded-md'
                />
              </UserPrivateComponent>
            </div>
          }
        >
          <div
            className='p-4'
            dangerouslySetInnerHTML={{ __html: formattedText }}
          />
        </Card>
      )}
      {openToEdit && (
        <Card
          Card
          title={<>ID: {id} </>}
          extra={
            <div className='flex items-center gap-3'>
              <UserPrivateComponent permission={"update-termsAndCondition"}>
                <EditOutlined
                  onClick={() => {
                    dispatch(editTermsAndCondition(termsAndConditions));
                  }}
                  className='bg-gray-600 p-2 text-white rounded-md'
                  style={{ fontSize: "15px" }}
                />
              </UserPrivateComponent>
              <UserPrivateComponent permission={"delete-termsAndCondition"}>
                <DeleteOutlined
                  onClick={() => onDelete(id)}
                  className='bg-red-600 p-2 text-white rounded-md'
                />
              </UserPrivateComponent>
            </div>
          }
        >
          <Form
            form={form}
            layout='vertical'
            className='sm:mx-10'
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            autoComplete='off'
            labelAlign='left'
          >
            <Form.Item
              label='Title'
              name='title'
              rules={[
                {
                  required: true,
                  message: "Please enter title!",
                },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              style={{ marginBottom: "10px" }}
              label='Terms And Conditions'
              name={"subject"}
              rules={[
                {
                  required: true,
                  message: "Please input Terms And Conditions!",
                },
              ]}
            >
              <TextArea
                rows={5}
                onChange={handleText}
                onKeyPress={handleTextareaKeyDown}
              />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              className='flex justify-center mt-[24px]'
            >
              <Button
                loading={loader}
                onClick={() => setLoader(true)}
                type='primary'
                htmlType='submit'
                shape='round'
              >
                Update Terms And Conditions
              </Button>
              <Button onClick={() => setOpenToEdit(false)} className='ml-5'>
                Close
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}
    </>
  );
}
