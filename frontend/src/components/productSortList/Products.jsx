import { PlusOutlined } from "@ant-design/icons";
import { Button, Form, InputNumber, Select } from "antd";
import { useEffect } from "react";
import { CiCircleRemove } from "react-icons/ci";
import { useDispatch, useSelector } from "react-redux";
import { loadProduct } from "../../redux/rtk/features/product/productSlice";

export default function Products({ form }) {
  const dispatch = useDispatch();
  const { list: productList, loading: productLoading } = useSelector(
    (state) => state.products
  );

  const handleSetInitial = (serial) => {
    const productArray = form.getFieldValue("products");
    const newArray = productArray.map((product, index) => {
      if (index === serial) {
        return {
          ...product,
          productQuantity: 0,
        };
      } else {
        return product;
      }
    });

    form.setFieldsValue({
      products: newArray,
    });
  };

  useEffect(() => {
    dispatch(loadProduct({ query: "all" }));
  }, [dispatch]);
  return (
    <>
      <div className='grid grid-cols-12 gap-2'>
        <div className='col-span-1 font-weight-bold md:text-base xxs:text-xs'>
          SL
        </div>

        <div className='col-span-8 font-weight-bold md:text-base xxs:text-xs'>
          Product
        </div>

        <div className='col-span-2 font-weight-bold md:text-base xxs:text-xs'>
          Quantity
        </div>

        <div className='col-span-1 md:text-base xxs:text-xs'></div>
      </div>

      <hr style={{ backgroundColor: "black", marginTop: "0.5rem" }} />

      <Form.List
        name='products'
        rules={[
          {
            required: true,
            message: "Product is required",
          },
        ]}
      >
        {(fields, { add, remove }) => (
          <>
            <div className='max-h-[200px] grid w-full overflow-y-auto overflow-x-visible mt-2'>
              {fields.map(({ key, name, ...restField }, index) => (
                <div className='grid grid-cols-12 gap-2' key={key}>
                  <div className='col-span-1'>{index + 1}</div>
                  <div className='col-span-8'>
                    <Form.Item
                      {...restField}
                      name={[name, "id"]}
                      rules={[
                        {
                          required: true,
                          message: "Product is required",
                        },
                      ]}
                    >
                      <Select
                        placeholder='Select Product'
                        showSearch
                        loading={productLoading}
                        optionFilterProp='children'
                        filterOption={(input, option) =>
                          option.children
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                        onChange={() => {
                          handleSetInitial(index);
                        }}
                      >
                        {productList?.map((item) => (
                          <Select.Option key={item.id} value={item.id}>
                            {item.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>

                  <div className='col-span-2'>
                    <Form.Item
                      {...restField}
                      name={[name, "productQuantity"]}
                      rules={[
                        {
                          required: true,
                          message: "quantity is required",
                        },
                      ]}
                    >
                      <InputNumber
                        // className="w-full text-sm xxs:p-0 md:p-2"
                        size={"small"}
                        placeholder='Quantity'
                      />
                    </Form.Item>
                  </div>
                  <div className='col-span-1'>
                    <Form.Item>
                      <button
                        shape='circle'
                        className='flex justify-center items-center hover:bg-black/40 rounded-md'
                        onClick={() => {
                          remove(name);
                        }}
                      >
                        <CiCircleRemove size={25} />
                      </button>
                    </Form.Item>
                  </div>
                </div>
              ))}
            </div>
            <Form.Item style={{ marginTop: "20px" }}>
              <Button
                type='dashed'
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
              >
                Add Product
              </Button>
            </Form.Item>
          </>
        )}
      </Form.List>
    </>
  );
}
