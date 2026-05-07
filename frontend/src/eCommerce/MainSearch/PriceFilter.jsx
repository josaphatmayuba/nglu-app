import { Form, InputNumber } from "antd";

export default function PriceFilter({ setPageConfig }) {
  const onFinish = (values) => {
    setPageConfig((prev) => {
      return {
        ...prev,
        priceRange: `${values.min}-${values.max}`,
      };
    });
  };
  const onFinishFailed = (errorInfo) => {
    console.log("Failed:", errorInfo);
  };

  const clearPrice = () => {
    setPageConfig((prev) => {
      return {
        ...prev,
        priceRange: false,
      };
    });
  };
  return (
    <>
      <Form
        name="basic"
        layout="inline"
        className="flex-nowrap"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        initialValues={{
          min: 0,
          max: 1,
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center">
            <div>
              <Form.Item
                name="min"
                rules={[
                  {
                    required: true,
                    message: "Please input",
                  },
                ]}
              >
                <InputNumber size="small" />
              </Form.Item>
            </div>
            <div>
              <Form.Item
                name="max"
                rules={[
                  {
                    required: true,
                    message: "Please input",
                  },
                ]}
              >
                <InputNumber min={1} size="small" />
              </Form.Item>
            </div>
          </div>
          <div className="flex justify-end items-center">
            <Form.Item>
              <button
                onClick={clearPrice}
                type="reset"
                className="bg-gray-500 text-white rounded h-[34px] px-3"
              >
                Clear
              </button>
            </Form.Item>
            <Form.Item>
              <button
                type="submit"
                className="bg-ePrimary text-white rounded h-[34px] px-3"
              >
                Submit
              </button>
            </Form.Item>
          </div>
        </div>
      </Form>
    </>
  );
}
