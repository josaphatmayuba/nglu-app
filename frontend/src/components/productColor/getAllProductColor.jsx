import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteColor,
  loadColorPaginated,
} from "../../redux/rtk/features/color/colorSlice";

import { useState } from "react";
import Card from "../../UI/Card";
import PageHeader from "../../UI/PageHeader";
import CommonDelete from "../CommonUi/CommonDelete";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddProductColor from "./addProductColor";
import UpdateProductColor from "./updateProductColor";

const GetAllProductColor = (props) => {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector((state) => state.colors);
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
  });

  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      id: 2,
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      id: 3,
      title: "Color Code",
      dataIndex: "colorCode",
      key: "colorCode",
      render: (colorCode) => (
        <div className="flex">
          <div
            className="rounded border border-gray-200"
            style={{
              marginRight: "10px",
              width: "20px",
              height: "20px",
              backgroundColor: colorCode,
            }}
          ></div>
          {colorCode}
        </div>
      ),
      renderCsv: (colorCode) => colorCode,
    },
    {
      id: 3,
      title: "",
      dataIndex: "",
      key: "action",
      render: (color) => [
        {
          label: (
            <UserPrivateComponent permission="update-color">
              <UpdateProductColor
                data={{ name: color?.name, colorCode: color?.colorCode }}
                id={color?.id}
              />
            </UserPrivateComponent>
          ),
          key: "edit",
        },

        {
          label: (
            <CommonDelete
              values={{
                id: color?.id,
                status: color?.status,
              }}
              title={color?.status === "true" ? "Hide" : "Show"}
              permission={"delete-productCategory"}
              deleteThunk={deleteColor}
              loadThunk={loadColorPaginated}
              query={{ ...pageConfig, status: color?.status }}
              className="bg-white text-black"
            />
          ),
          key: "delete",
        },
      ],

      csvOff: true,
    },
  ];
  const filters = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Show", value: "true" },
        { label: "Hide", value: "false" },
      ],
      className: "min-w-[85px] max-w-[150px]",
      popupClassName: "w-[200px]",
    },
  ];

  useEffect(() => {
    dispatch(loadColorPaginated(pageConfig));
  }, [dispatch, pageConfig]);

  return (
    <>
      <PageHeader
        title="Couleurs"
        subtitle="Couleurs disponibles pour les produits"
        actions={
          <CreateDrawer
            permission={"create-color"}
            title={"Create Color"}
            width={35}
          >
            <AddProductColor />
          </CreateDrawer>
        }
      />
      <Card
        className="max-md:border-0 max-md:bg-white"
        bodyClass="max-md:p-0 "
      >
      {" "}
      <UserPrivateComponent permission={"readAll-color"}>
        <TableComponent
          actionPermission={[
            "update-color",
            "delete-color",
            "readSingle-color",
          ]}
          list={list}
          columns={columns}
          total={total}
          loading={loading}
          setPageConfig={setPageConfig}
          title={"Product Color List"}
          filters={filters}
          isSearch
        />
      </UserPrivateComponent>
    </Card>
    </>
  );
};

export default GetAllProductColor;
