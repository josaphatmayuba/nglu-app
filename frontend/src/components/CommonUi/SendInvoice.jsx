import { sendEmail } from "@/redux/rtk/features/emailConfig/emailConfigSlice";
import { getSetting } from "@/redux/rtk/features/setting/settingSlice";
import purchasePDF from "@/utils/purchasePDF";
import useCurrency from "@/utils/useCurrency";
import { CaretRightOutlined } from "@ant-design/icons";
import { Button, Collapse, Form, Input } from "antd";
import { useEffect, useState } from "react";
import ReactQuill from "react-quill";
import { useDispatch, useSelector } from "react-redux";
import TagInput from "./TagInput";

export default function SendInvoice({
  invoiceId,
  setIsModalOpen,
  invoiceName,
}) {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [loader, setLoader] = useState(false);

  const [body, setBody] = useState("");
  const [cc, setCc] = useState([]);
  const [bcc, setBcc] = useState([]);
  const purchase = useSelector((state) => state.purchases.purchase);
  const companyInfo = useSelector((state) => state?.setting?.data) || null;
  const { currencySymbol } = useCurrency() || {};

  const { singlePurchaseInvoice } = purchase ? purchase : {};
  
  const onFinish = async (values) => {
    setLoader(true);
    
    try {
      let formData = new FormData();
      const file = await purchasePDF(
        singlePurchaseInvoice,
        companyInfo,
        "Purchase Invoice",
        currencySymbol
      );
      formData.append("receiverEmail", values.receiverEmail);
      formData.append("subject", values.subject);
      formData.append("body", body);

      formData.append("files[]", file, "OrderInvoice.pdf");
      cc.forEach((ccValue) => {
        formData.append("cc[]", ccValue);
      });

      bcc.forEach((bccValue) => {
        formData.append("bcc[]", bccValue);
      });
      const resp = await dispatch(sendEmail(formData));
      if (resp.payload.message === "success") {
        setIsModalOpen(false);
        setLoader(false);
      }
    } catch (error) {
      console.log(error);
    }
    setLoader(false);
  };

  const bodyHandler = (val) => {
    setBody(val);
  };
  const textEditorModule = {
    toolbar: [
      [{ header: "1" }, { header: "2" }, { font: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["bold", "italic", "underline"],
      ["link", "image"],
      [{ color: [] }, { background: [] }],
      ["clean"],
    ],
  };
  const textEditorFormats = [
    "header",
    "font",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "list",
    "bullet",
    "indent",
    "link",
    "image",
    "color",
    "background",
  ];
  const onFinishFailed = () => {};

  useEffect(() => {
    !companyInfo && dispatch(getSetting());
  });
  return (
    <div className={"py-4 px-4 border-t"}>
      <p className="text-[16px] text-red-500 p-4">
        If send {invoiceName} invoice without the customer&lsquo;s default email
      </p>
      <Form
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        colon={false}
        layout="vertical"
        form={form}
      >
        <Form.Item style={{ width: "100%" }} label="To" name="receiverEmail">
          <Input placeholder="Receiver Email" />
        </Form.Item>

        <Collapse
          bordered={false}
          defaultActiveKey={["1"]}
          expandIcon={({ isActive }) => (
            <CaretRightOutlined rotate={isActive ? 90 : 0} />
          )}
          className="site-collapse-custom-collapse mb-4"
        >
          <Collapse.Panel header="CC & BCC" key="1">
            <TagInput label={"CC"} tags={cc} setTags={setCc} />

            <TagInput label={"BCC"} tags={bcc} setTags={setBcc} />
          </Collapse.Panel>
        </Collapse>

        <Form.Item style={{ width: "100%" }} label="Subject" name="subject">
          <Input placeholder="Subject" />
        </Form.Item>
        <Form.Item style={{ marginBottom: "25px" }} label="Body">
          <ReactQuill
            value={body}
            onChange={bodyHandler}
            modules={textEditorModule}
            formats={textEditorFormats}
          />
        </Form.Item>
        <Form.Item>
          <Button
            loading={loader}
            size={"large"}
            htmlType="submit"
            type="primary"
          >
            Send
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
