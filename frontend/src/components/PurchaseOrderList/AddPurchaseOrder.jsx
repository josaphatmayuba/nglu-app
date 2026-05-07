import { Button, Form } from "antd";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addPurchaseOrder } from "../../redux/rtk/features/productSortList/ProductSortListSlice";
import Products from "../productSortList/Products";

export default function AddPurchaseOrder({ list }) {
  const [loader, setLoader] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Form Function
  const [form] = Form.useForm();

  const onFormSubmit = async (values) => {
    const data = values.products.map((item) => {
      return {
        productId: item.id,
        productQuantity: item.productQuantity,
      };
    });
    try {
      const resp = await dispatch(addPurchaseOrder(data));
      if (resp.payload.message === "success") {
        form.resetFields();
        setLoader(false);
        navigate(
          `/admin/purchase-reorder-invoice/${resp.payload.data[0]?.reorderInvoiceId}`
        );
      } else {
        setLoader(false);
      }
    } catch (error) {
      setLoader(false);
    }
  };

  useEffect(() => {
    form.setFieldsValue({ products: list });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, list]);
  return (
    <div>
      <Form
        form={form}
        className='w-full '
        name='dynamic_form_nest_item'
        onFinish={onFormSubmit}
        onFinishFailed={() => {
          setLoader(false);
        }}
        layout='vertical'
        size='large'
        autoComplete='off'
        initialValues={{}}
      >
        <Products form={form} />

        <Form.Item style={{ marginTop: "15px" }}>
          <Button
            block
            type='primary'
            htmlType='submit'
            loading={loader}
            onClick={() => setLoader(true)}
          >
            Create Purchase Order
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
