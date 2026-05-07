import {
  BookOutlined,
  CalendarOutlined,
  DollarOutlined,
  EditOutlined,
  HomeOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  StarOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Avatar, Card, Col, Modal, Row } from "antd";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import BtnDeleteSvg from "../UI/Button/btnDeleteSvg";
import Loader from "../loader/loader";

import EmployeeAward from "../UI/EmployeeAward";
import EmployeeDesignation from "../UI/EmployeeDesignation";
import EmployeeSalary from "../UI/EmployeeSalary";
import EmployeeTimeline from "../UI/EmployeeTimeline";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteStaff,
  loadAllStaff,
  loadSingleStaff,
} from "../../redux/rtk/features/user/userSlice";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AwardHistoryEditPopup from "../UI/PopUp/PopUp/AwardHistoryEditPopup";
import DesignationEditPopup from "../UI/PopUp/PopUp/DesignationEditPopup";
import EducationEditPopup from "../UI/PopUp/PopUp/EducationEditPopup";
import SalaryEditPopup from "../UI/PopUp/PopUp/SalaryEditPopup";
import UpdateStaff from "./updateStaff";

const DetailStaff = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  let navigate = useNavigate();
  const { user, loading } = useSelector((state) => state.users);

  // Modal State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Delete/Hide Handler
  const handleDeleteStaff = async () => {
    if (window.confirm("Are you sure you want to Hide this staff?")) {
      await dispatch(deleteStaff({ id, status: "false" }));
      navigate(-1);
      dispatch(loadAllStaff({ page: 1, count: 10, status: "true" }));
    }
  };

  useEffect(() => {
    dispatch(loadSingleStaff(id));
  }, [dispatch, id]);

  const InfoItem = ({ icon, label, value, isAddress = false }) => (
    <div
      className={`flex ${isAddress ? "items-start" : "items-center"} py-3 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 flex-col sm:flex-row`}>
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-2 sm:mb-0">
        {icon}
      </div>
      <div className="ml-0 sm:ml-4 flex-1 text-center sm:text-left">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </p>
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
          {value}
        </div>
      </div>
    </div>
  );

  const SectionCard = ({
    title,
    editButton,
    children,
    isEmpty,
    emptyMessage,
  }) => (
    <Card
      className="h-full shadow-sm hover:shadow-md transition-shadow duration-300 border-0 rounded-xl overflow-hidden"
      bodyStyle={{ padding: 0 }}>
      <div className="bg-gray-50 dark:bg-gray-800 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center mb-2 sm:mb-0">
          {title}
        </h3>
        {editButton}
      </div>
      <div className="p-4 sm:p-6">
        {isEmpty ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-3xl sm:text-5xl mb-4">
              <BookOutlined />
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4 font-medium text-sm sm:text-base">
              {emptyMessage}
            </p>
            <Alert
              message="Click on edit button to add new"
              type="info"
              showIcon
              className="max-w-md mx-auto text-xs sm:text-sm"
            />
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
      <UserPrivateComponent permission={"readSingle-user"}>
        {user ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card
              className="mb-6 shadow-sm border-0 rounded-2xl overflow-hidden"
              bodyStyle={{ padding: 0 }}>
              <div className="bg-gray-100 dark:bg-gray-800 h-12"></div>
              <div className="px-4 pb-2">
                <div className="flex flex-col sm:flex-row items-center -mt-8">
                  <Avatar
                    size={60}
                    className="border-4 border-white shadow-sm bg-gray-400 text-white font-bold text-2xl mb-4 sm:mb-0">
                    {user.firstName?.charAt(0).toUpperCase() ||
                      user.lastName?.charAt(0).toUpperCase()}
                  </Avatar>
                  <div className="ml-0 sm:ml-3 flex-1 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-2">
                      <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2 sm:mb-0">
                        {user.firstName} {user.lastName}{" "}
                        <span className="text-xs">{`(${user.username})`}</span>
                      </h1>

                      <div className="flex gap-2 items-center">
                        {/*  Fix: Update Button that triggers Modal */}
                        <UserPrivateComponent permission="update-user">
                          <button
                            type="button"
                            onClick={() => setIsUpdateModalOpen(true)}
                            className="bg-blue-50 text-blue-600 hover:text-blue-800 rounded-lg p-2 flex items-center justify-center transition-colors border-0 cursor-pointer">
                            <EditOutlined className="text-xl" />
                          </button>
                        </UserPrivateComponent>

                        {/*  Fix: Delete Button properly structured */}
                        <UserPrivateComponent permission="delete-user">
                          <button
                            type="button"
                            onClick={handleDeleteStaff}
                            className="text-red-600 hover:text-red-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-1 bg-transparent border-0 flex items-center justify-center cursor-pointer">
                            <BtnDeleteSvg size={30} />
                          </button>
                        </UserPrivateComponent>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 text-xs mt-1 flex-wrap justify-center sm:justify-start">
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full flex items-center justify-center">
                        <IdcardOutlined className="mr-1" />
                        ID: {user.employeeId || "Not Assigned"}
                      </span>
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full flex items-center justify-center">
                        <TrophyOutlined className="mr-1" />
                        {user.designationHistory?.length
                          ? user.designationHistory[0].designation?.name
                          : "No Designation"}
                      </span>
                      <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-full flex items-center justify-center">
                        <TeamOutlined className="mr-1" />
                        {user?.department?.name || "No Department"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card
                  className="h-full shadow-sm border-0 rounded-xl"
                  title={
                    <span className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
                      <UserOutlined className="mr-2" />
                      Personal Information
                    </span>
                  }>
                  <div className="space-y-1">
                    <InfoItem
                      icon={<TeamOutlined style={{ fontSize: "18px" }} />}
                      label="Department"
                      value={user?.department?.name || "No Department"}
                    />
                    <InfoItem
                      icon={<TrophyOutlined style={{ fontSize: "18px" }} />}
                      label="Employment Status"
                      value={user?.employmentStatus?.name || "No Status"}
                    />
                    <InfoItem
                      icon={<CalendarOutlined style={{ fontSize: "18px" }} />}
                      label="Join Date"
                      value={
                        user?.joinDate
                          ? dayjs(user?.joinDate).format("DD/MM/YYYY")
                          : "Date Not Found"
                      }
                    />
                    <InfoItem
                      icon={<CalendarOutlined style={{ fontSize: "18px" }} />}
                      label="Leave Date"
                      value={
                        user?.leaveDate
                          ? dayjs(user?.leaveDate).format("DD/MM/YYYY")
                          : "PRESENT"
                      }
                    />
                    <InfoItem
                      icon={<UserOutlined style={{ fontSize: "18px" }} />}
                      label="Role"
                      value={user?.role?.name || "No Role"}
                    />
                  </div>
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card
                  className="h-full shadow-sm border-0 rounded-xl"
                  title={
                    <span className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
                      <PhoneOutlined className="mr-2" />
                      Contact Information
                    </span>
                  }>
                  <div className="space-y-1">
                    <InfoItem
                      icon={<MailOutlined style={{ fontSize: "18px" }} />}
                      label="Email"
                      value={user?.email || "No Email"}
                    />
                    <InfoItem
                      icon={<PhoneOutlined style={{ fontSize: "18px" }} />}
                      label="Phone"
                      value={user?.phone || "No Phone"}
                    />
                    <InfoItem
                      icon={<HomeOutlined style={{ fontSize: "18px" }} />}
                      label="Address"
                      isAddress={true}
                      value={
                        <div className="space-y-1">
                          <div>{user?.street || "No Street"}</div>
                          <div>{user?.city || "No City"}</div>
                          <div>{user?.state || "No State"}</div>
                          <div>{user?.country || "No Country"}</div>
                          <div>{user?.zipCode || "No Zip Code"}</div>
                        </div>
                      }
                    />
                    <InfoItem
                      icon={
                        <ThunderboltOutlined style={{ fontSize: "18px" }} />
                      }
                      label="Blood Group"
                      value={user?.bloodGroup || "No Blood Group"}
                    />
                  </div>
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <SectionCard
                  title={
                    <span className="flex items-center">
                      <TrophyOutlined className="mr-2" />
                      Designation History
                    </span>
                  }
                  editButton={
                    <UserPrivateComponent
                      permission={"update-designationHistory"}>
                      <DesignationEditPopup data={user?.designationHistory} />
                    </UserPrivateComponent>
                  }
                  isEmpty={!user.designationHistory?.length}
                  emptyMessage="No Designation History Found">
                  <EmployeeDesignation list={user?.designationHistory} />
                </SectionCard>
              </Col>

              <Col xs={24} lg={12}>
                <SectionCard
                  title={
                    <span className="flex items-center">
                      <BookOutlined className="mr-2" />
                      Education History
                    </span>
                  }
                  editButton={
                    <UserPrivateComponent permission={"update-education"}>
                      <EducationEditPopup data={user?.education} />
                    </UserPrivateComponent>
                  }
                  isEmpty={!user?.education?.length}
                  emptyMessage="No Education History Found">
                  <EmployeeTimeline list={user?.education} />
                </SectionCard>
              </Col>

              <Col xs={24} lg={12}>
                <SectionCard
                  title={
                    <span className="flex items-center">
                      <DollarOutlined className="mr-2" />
                      Salary History
                    </span>
                  }
                  editButton={
                    <UserPrivateComponent permission={"update-salaryHistory"}>
                      <SalaryEditPopup data={user?.salaryHistory} />
                    </UserPrivateComponent>
                  }
                  isEmpty={!user.salaryHistory?.length}
                  emptyMessage="No Salary History Found">
                  <EmployeeSalary list={user?.salaryHistory} />
                </SectionCard>
              </Col>

              <Col xs={24} lg={12}>
                <SectionCard
                  title={
                    <span className="flex items-center">
                      <StarOutlined className="mr-2" />
                      Award History
                    </span>
                  }
                  editButton={
                    <UserPrivateComponent permission={"update-awardHistory"}>
                      <AwardHistoryEditPopup data={user?.awardHistory} />
                    </UserPrivateComponent>
                  }
                  isEmpty={!user.awardHistory?.length}
                  emptyMessage="No Award History Found">
                  <EmployeeAward list={user?.awardHistory} />
                </SectionCard>
              </Col>
            </Row>

            {/*  Fix: Update Staff Modal Component */}
            <Modal
              title="Update Staff Information"
              open={isUpdateModalOpen}
              onCancel={() => setIsUpdateModalOpen(false)}
              footer={null}
              width={800}
              destroyOnClose>
              <UpdateStaff
                passedUser={user}
                onClose={() => {
                  setIsUpdateModalOpen(false);
                  dispatch(loadSingleStaff(id));
                }}
              />
            </Modal>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            {loading && <Loader />}
          </div>
        )}
      </UserPrivateComponent>
    </div>
  );
};

export default DetailStaff;
