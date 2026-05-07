import { EditOutlined } from "@ant-design/icons";
import { Card, Modal } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import {
  clearDepartment,
  loadSingleDepartment,
  updateDepartment,
} from "../../redux/rtk/features/department/departmentSlice";
import ViewBtn from "../Buttons/ViewBtn";
import TableNoPagination from "../CommonUi/TableNoPagination";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import Loader from "../loader/loader";
import UpdateDepartment from "./UpdateDepartment";
export default function DetailsDepartment() {
  const dispatch = useDispatch();
  const { id } = useParams();
  const { department, loading } = useSelector((state) => state.department);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };
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
      dataIndex: "username",
      key: "username",
    },
    {
      id: 6,
      title: "action",
      key: "action",
      render: ({ id }) => <ViewBtn path={`/admin/hr/staffs/${id}`} />,
    },
  ];
  useEffect(() => {
    dispatch(loadSingleDepartment(id));
    return () => {
      dispatch(clearDepartment());
    };
  }, [dispatch, id]);

  const rightElement = (
    <>
      <h5 className="text-lg">Employee List</h5>
    </>
  );
  return (
    <div>
      <div className="mr-top">
        {department ? (
          <Card
            className="border-0 md:border md:p-6 bg-transparent md:bg-[#fafafa]"
            bodyStyle={{ padding: 0 }}
            key={department.id}>
            <div className="md:flex flex justify-between md:mb-8 items-center gap-2">
              <h5 className="flex items-center">
                <span className="mr-left">{department.name}</span>
              </h5>

              <div className="flex items-center gap-2">
                <UserPrivateComponent permission={"update-department"}>
                  <EditOutlined
                    onClick={() => {
                      dispatch(updateDepartment());
                      showModal();
                    }}
                    className="bg-gray-600 p-3 text-white rounded-md"
                  />
                </UserPrivateComponent>
              </div>
            </div>
            <TableNoPagination
              loading={loading}
              list={department?.user}
              columns={columns}
              csvFileName={department.name}
              rightElement={rightElement}
            />
          </Card>
        ) : (
          <Loader />
        )}
      </div>
      <Modal
        title="Update Department"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={false}>
        <UpdateDepartment handleCancel={handleCancel} />
      </Modal>
    </div>
  );
}
