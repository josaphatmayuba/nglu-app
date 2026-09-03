import Card from "@/UI/Card";
import { groupByAttribute } from "@/utils/functions";
import { Image } from "antd";
import moment from "moment";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import {
  clearProduct,
  loadSingleProduct,
} from "../../redux/rtk/features/product/productSlice";
import useCurrency from "../../utils/useCurrency";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import Loader from "../loader/loader";
import GalleryImageSlider from "./GalleryImageSlider";
import GenerateBarcode from "./barcodeGenerator";

const DetailsProduct = () => {
  const { id } = useParams();

  //dispatch
  const dispatch = useDispatch();
  const product = useSelector((state) => state.products.product);

  const currency = useCurrency();

  useEffect(() => {
    dispatch(loadSingleProduct(id));
    return () => {
      dispatch(clearProduct());
    };
  }, [dispatch, id]);

  const handleOnError = (e) => {
    e.target.src = "/images/default.jpg";
  };

  return (
    <>
      {product ? (
        <div className="space-y-4 md:space-y-6 px-4 md:px-6 lg:px-8">
          {/* Header Card */}
          <Card className="bg-white">
            <div className="flex flex-row justify-between items-center gap-4 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
                    {product?.name}
                  </h1>
                  {product?.status === "true" ? (
                    <span className="px-3 py-1 text-xs font-semibold bg-green-500 text-white rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 text-xs font-semibold bg-gray-500 text-white rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  SKU:{" "}
                  <span className="font-semibold text-gray-800">
                    {product?.sku}
                  </span>
                </p>
              </div>
            </div>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Left Column - Product Image & Barcode */}
            <div className="lg:col-span-1">
              <Card className="bg-white">
                <div className="space-y-4 p-4">
                  <div className="flex justify-center bg-gray-50 rounded-lg p-4">
                    <Image
                      className="w-full max-w-[280px] aspect-square object-cover rounded-lg"
                      src={
                        product?.productThumbnailImageUrl ||
                        "/images/default.jpg"
                      }
                      onError={handleOnError}
                    />
                  </div>

                  <div className="flex justify-center bg-gray-50 rounded-lg p-4">
                    <GenerateBarcode sku={product?.sku} />
                  </div>

                  {product?.productColor?.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        Available Colors:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {product?.productColor?.map((item, index) => (
                          <div
                            key={index}
                            className="w-10 h-10 rounded-full border-2 border-gray-300 cursor-pointer"
                            style={{ backgroundColor: item.color?.colorCode }}
                            title={item.color?.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column - Details */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {/* Pricing Card */}
              <Card className="bg-white">
                <div className="p-4">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-green-500 rounded"></span>
                    Product Pricing
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">
                        Selling Price
                      </p>
                      <p className="text-2xl font-bold text-gray-800">
                        <span
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(currency?.currencySymbol),
                          }}
                        />
                        {product?.productSalePrice}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">
                        Purchase Price
                      </p>
                      <p className="text-2xl font-bold text-gray-800">
                        <span
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(currency?.currencySymbol),
                          }}
                        />
                        {product?.productPurchasePrice}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Specifications Card */}
              <Card className="bg-white">
                <div className="p-4">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-indigo-500 rounded"></span>
                    Specifications
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center py-2 border-b border-gray-100 hover:bg-gray-50 px-2 rounded transition-colors">
                      <span className="text-sm text-gray-500 w-1/3">Brand</span>
                      <Link
                        to={`/admin/product-brand/${product?.productBrand?.id}`}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                        {product?.productBrand?.name}
                      </Link>
                    </div>
                    <div className="flex items-center py-2 border-b border-gray-100 hover:bg-gray-50 px-2 rounded transition-colors">
                      <span className="text-sm text-gray-500 w-1/3">
                        Category
                      </span>
                      <Link
                        to={`/admin/product-category/${product?.productSubCategory?.productCategory?.id}`}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                        {product?.productSubCategory?.productCategory?.name}
                      </Link>
                    </div>
                    <div className="flex items-center py-2 border-b border-gray-100 hover:bg-gray-50 px-2 rounded transition-colors">
                      <span className="text-sm text-gray-500 w-1/3">
                        Sub-category
                      </span>
                      <Link
                        to={`/admin/product-subcategory/${product?.productSubCategoryId}`}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                        {product?.productSubCategory?.name}
                      </Link>
                    </div>
                    {product?.uom && (
                      <div className="flex items-center py-2 border-b border-gray-100 hover:bg-gray-50 px-2 rounded transition-colors">
                        <span className="text-sm text-gray-500 w-1/3">UoM</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {`${product?.uomValue}${product?.uom?.name ? `/${product.uom.name}` : ""}`}
                        </span>
                      </div>
                    )}
                    {product?.productProductAttributeValue &&
                      groupByAttribute(
                        product.productProductAttributeValue,
                      ).map((item1, index) => (
                        <div
                          key={index}
                          className="flex items-center py-2 border-b border-gray-100 hover:bg-gray-50 px-2 rounded transition-colors">
                          <span className="text-sm text-gray-500 w-1/3">
                            {
                              item1[0].productAttributeValue.productAttribute
                                .name
                            }
                          </span>
                          <span className="text-sm font-semibold text-gray-800 flex flex-wrap gap-2">
                            {item1.map((item, idx) => (
                              <span
                                key={idx}
                                className="bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                                {item.productAttributeValue.name}
                              </span>
                            ))}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </Card>

              {/* Item Details & Stock Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <Card className="bg-white">
                  <div className="p-4">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="w-1 h-6 bg-purple-500 rounded"></span>
                      Item Details
                    </h2>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-100 hover:bg-gray-50 px-2 rounded transition-colors">
                        <span className="text-sm text-gray-500">Vat/Tax</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {product?.productVat?.percentage || 0}%
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100 hover:bg-gray-50 px-2 rounded transition-colors">
                        <span className="text-sm text-gray-500">Discount</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {product?.discount?.value
                            ? `${product?.discount.value}${product?.discount.type == "percentage" ? "%" : " flat"}`
                            : "0%"}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 hover:bg-gray-50 px-2 rounded transition-colors">
                        <span className="text-sm text-gray-500">Date</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {moment(product?.createdAt).format("DD/MM/YYYY")}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="bg-white">
                  <div className="p-4">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="w-1 h-6 bg-orange-500 rounded"></span>
                      Stock Details
                    </h2>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-100 hover:bg-gray-50 px-2 rounded transition-colors">
                        <span className="text-sm text-gray-500">Quantity</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {product?.productQuantity}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 hover:bg-gray-50 px-2 rounded transition-colors">
                        <span className="text-sm text-gray-500">
                          ReOrder Quantity
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                          {product?.reorderQuantity}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Gallery & Description */}
              <div className="grid grid-cols-1 gap-4 md:gap-6">
                <Card className="bg-white">
                  <div className="p-4">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="w-1 h-6 bg-pink-500 rounded"></span>
                      Gallery Images
                    </h2>
                    {product?.galleryImage &&
                    product.galleryImage.length > 0 ? (
                      <GalleryImageSlider data={product?.galleryImage} />
                    ) : (
                      <p className="text-sm text-gray-500">
                        No gallery images available.
                      </p>
                    )}
                  </div>
                </Card>

                <Card className="bg-white">
                  <div className="p-4">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="w-1 h-6 bg-teal-500 rounded"></span>
                      Product Description
                    </h2>
                    {product?.description ? (
                      <div
                        className="prose prose-sm max-w-none text-gray-700"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(product?.description),
                        }}
                      />
                    ) : (
                      <p className="text-sm text-gray-500">
                        No description available.
                      </p>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Loader />
      )}
    </>
  );
};

export default DetailsProduct;
