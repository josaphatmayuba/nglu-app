import Card from "@/UI/Card";
import { Form, InputNumber, Select } from "antd";
import { useEffect, useState } from "react";
import { FaEye } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { loadAllPrintPagePaginated } from "../../redux/rtk/features/printPage/printPageSlice";
import { loadSingleProduct } from "../../redux/rtk/features/product/productSlice";
import BigDrawer from "../Drawer/BigDrawer";
import AddPrintPage from "../printPageSettings/AddPrintPage";
import AllCodePrint from "./AllCodePrint";
import PreviewBarCode from "./PreviewBarCode";

export default function PrintBarCode() {
  const { id } = useParams("id");
  const dispatch = useDispatch();
  const { product, loading } = useSelector((state) => state.products);
  const { list: printPage, loading: printLoading } = useSelector(
    (state) => state.print
  );
  const [preview, setPreview] = useState(false);

  const [printPaper, setPrintPaper] = useState({
    pageName: "A4",
    row: 10,
    col: 3,
    height: 60,
    width: 1.5,
    fontSize: 15,
  });

  useEffect(() => {
    dispatch(loadSingleProduct(id));
    dispatch(loadAllPrintPagePaginated({ status: "true", page: 1, count: 10 }));
  }, [dispatch, id]);

  return (
    <Card
      title={"Print Barcode"}
      extra={
        <div className=' flex'>
          <div>
            <button
              onClick={() => setPreview(true)}
              className=' bg-primary duration-200 font-medium mx-3 px-5 py-2 text-white rounded'
            >
              Preview <FaEye className='inline' />{" "}
            </button>
          </div>
          {printPage && (
            <AllCodePrint
              product={product}
              printPaper={printPaper}
              printPage={printPage}
            />
          )}
        </div>
      }
    >
      <div className='bg-white p-3 rounded w-full md:w-[80%] lg:w-[60%] xl:w-[45%] 2xl:w-[40%] 3xl:w-[30%] mb-3'>
        <Form layout='vertical'>
          <Form.Item
            label={
              <div className='flex gap-2 items-center'>
                Page Size
                <BigDrawer>
                  <AddPrintPage />
                </BigDrawer>
              </div>
            }
            className='w-[80%] md:w-full'
          >
            <Select
              name='pageSize'
              loading={printLoading}
              showSearch
              placeholder='page size'
              optionFilterProp='children'
              filterOption={(input, option) => option.children.includes(input)}
              filterSort={(optionA, optionB) =>
                optionA.children
                  .toLowerCase()
                  .localeCompare(optionB.children.toLowerCase())
              }
              defaultValue={"A4"}
              onChange={(value) => {
                setPrintPaper({ ...printPaper, pageName: value });
              }}
            >
              {printPage &&
                printPage.map((page) => (
                  <Select.Option key={page.id} value={page.pageSizeName}>
                    {page.pageSizeName}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
          <div className='flex gap-2 items-center'>
            <Form.Item className='w-1/2' label='Column'>
              <InputNumber
                onChange={(value) =>
                  setPrintPaper({ ...printPaper, col: value })
                }
                defaultValue={printPaper?.col}
                size='small'
                placeholder='3'
              />
            </Form.Item>
            <Form.Item className='w-1/2' label='Row'>
              <InputNumber
                defaultValue={printPaper?.row}
                size='small'
                placeholder='10'
                onChange={(value) =>
                  setPrintPaper({ ...printPaper, row: value })
                }
              />
            </Form.Item>
          </div>
          <div className='flex items-center gap-2'>
            <Form.Item label='Height'>
              <InputNumber
                defaultValue={printPaper?.height}
                size='small'
                placeholder='60'
                onChange={(value) =>
                  setPrintPaper({ ...printPaper, height: value })
                }
              />
            </Form.Item>{" "}
            <Form.Item label='Width'>
              <InputNumber
                defaultValue={printPaper?.width}
                size='small'
                placeholder='1.5'
                step={0.1}
                onChange={(value) =>
                  setPrintPaper({ ...printPaper, width: value })
                }
              />
            </Form.Item>{" "}
            <Form.Item label='FontSize'>
              <InputNumber
                defaultValue={printPaper?.fontSize}
                size='small'
                placeholder='15'
                onChange={(value) =>
                  setPrintPaper({ ...printPaper, fontSize: value })
                }
              />
            </Form.Item>
          </div>
        </Form>
      </div>
      <div>
        {product && preview && (
          <PreviewBarCode
            printPage={printPage}
            product={product}
            printPaper={printPaper}
          />
        )}
      </div>
    </Card>
  );
}
