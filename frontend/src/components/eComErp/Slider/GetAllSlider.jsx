import moment from "moment";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../../UI/Card";
import {
  deleteSlider,
  loadAllSliderImages,
} from "../../../redux/rtk/features/eCommerce/slider/sliderSlice";
import CommonDelete from "../../CommonUi/CommonDelete";
import CreateDrawer from "../../CommonUi/CreateDrawer";
import TableComponent from "../../CommonUi/TableComponent";
import UserPrivateComponent from "../../PrivacyComponent/UserPrivateComponent";
import AddSlider from "./AddSlider";
import UpdateSlider from "./UpdateSlider";

export default function GetAllSlider() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.slider);
  const handleOnError = (e) => {
    e.target.src = "/images/default.jpg";
  };
  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      id: 3,
      title: "Image Index",
      dataIndex: "index",
      key: "index",
    },
    {
      id: 2,
      title: "Image",
      dataIndex: "image",
      render: (image) => (
        <div className='w-[2.5rem] h-[1.375rem] relative'>
          <img
            className='absolute object-cover w-full h-full'
            alt='product'
            onError={handleOnError}
            src={`${image}` || "/images/default.jpg"}
          />
        </div>
      ),

      csvOff: true,
      key: "image",
    },
    {
      id: 3,
      title: "Create Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) =>
        moment(createdAt).startOf("month").format("YYYY-MM-DD"),

      renderCsv: (createdAt) => moment(createdAt).format("DD/MM/YYYY"),
    },

    {
      id: 4,
      title: "",
      key: "action",
      render: (item) => [
        {
          label: (
            <UserPrivateComponent permission={"update-currency"}>
              <UpdateSlider item={item} />
            </UserPrivateComponent>
          ),
          key: "edit",
        },
        {
          label: (
            <CommonDelete
              permission={"delete-slider"}
              deleteThunk={deleteSlider}
              title='Hide'
              id={item.id}
              loadThunk={loadAllSliderImages}
            />
          ),
          key: "delete",
        },
      ],

      csvOff: true,
    },
  ];

  useEffect(() => {
    dispatch(loadAllSliderImages());
  }, [dispatch]);
  return (
    <Card
      className="max-md:border-0 max-md:bg-white"
      bodyClass="max-md:p-0 "
      // headClass="border-none"
      title={"Slider Images"}
      extra={
        <CreateDrawer
          permission={"create-currency"}
          title={"Create Slider"}
          width={35}
        >
          <AddSlider />
        </CreateDrawer>
      }
    >
      <UserPrivateComponent permission={"readAll-currency"}>
        <TableComponent
          total={null}
          columns={columns}
          list={list}
          loading={loading}
          title={"Slider Image"}
        />
      </UserPrivateComponent>
    </Card>
  );
}
