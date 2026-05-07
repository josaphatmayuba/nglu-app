import React, { useState, useEffect } from "react";
import { Button, Card, Col, DatePicker, Form, Input, Row, Select, Typography } from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { loadAllDesignation } from "../../redux/rtk/features/designation/designationSlice";
import { loadRolePaginated } from "../../redux/rtk/features/hr/role/roleSlice";
import { loadAllDepartment } from "../../redux/rtk/features/department/departmentSlice";
import { loadAllEmployeeStatus } from "../../redux/rtk/features/employeeStatus/employeeStatusSlice";
import { loadAllShift } from "../../redux/rtk/features/shift/shiftSlice";
import { updateStaff } from "../../redux/rtk/features/user/userSlice";
import { removeFalsyProperties } from "../../utils/functions";

function UpdateStaff({ passedUser, onClose }) {
  const dispatch = useDispatch();
  const { Title } = Typography;
  const [form] = Form.useForm();
  const { id: paramId } = useParams();
  const [loader, setLoader] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { Option } = Select;


  const user = passedUser || location.state?.data;
  const id = user?.id || paramId;

  const designation = useSelector((state) => state.designations?.list);
  const { list } = useSelector((state) => state.role);
  const { list: department } = useSelector((state) => state.department);
  const { list: employmentStatus } = useSelector((state) => state.employmentStatus);
  const { list: shift } = useSelector((state) => state.shift);

  useEffect(() => {
    dispatch(loadAllDesignation({ status: true, page: 1, count: 50 }));
    dispatch(loadRolePaginated({ status: true, page: 1, count: 50 }));
    dispatch(loadAllDepartment());
    dispatch(loadAllEmployeeStatus());
    dispatch(loadAllShift());
  }, [dispatch]);

  const role = localStorage.getItem("role");

  if (!user) {
    return <div className="text-center p-10 text-red-500 font-bold">User data not found!</div>;
  }

  const initValues = {
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    phone: user.phone,
    roleId: user.roleId,
    departmentId: user.departmentId,
    designationId: user.designationId,
    employmentStatusId: user.employmentStatusId,
    shiftId: user.shiftId,
    employeeId: user.employeeId,
    bloodGroup: user.bloodGroup,
    street: user.street,
    city: user.city,
    state: user.state,
    zipCode: user.zipCode,
    country: user.country,
    joinDate: user?.joinDate ? dayjs(user?.joinDate) : null,
    leaveDate: user?.leaveDate ? dayjs(user?.leaveDate) : null,
  };

  const onFinish = async (values) => {
    setLoader(true);
    
    const data = {
      ...values,
      roleId: values.roleId ? parseInt(values.roleId) : undefined,
      departmentId: values.departmentId ? parseInt(values.departmentId) : undefined,
      designationId: values.designationId ? parseInt(values.designationId) : undefined,
      employmentStatusId: values.employmentStatusId ? parseInt(values.employmentStatusId) : undefined,
      shiftId: values.shiftId ? parseInt(values.shiftId) : undefined,
      joinDate: values.joinDate ? values.joinDate.format("YYYY-MM-DD") : null,
      leaveDate: values.leaveDate ? values.leaveDate.format("YYYY-MM-DD") : null,
    };

    const value = removeFalsyProperties(data);
    const res = await dispatch(updateStaff({ id, values: value }));

    if (res.payload?.message === "success" || res.payload?.id) {
      setLoader(false);
      if (onClose) {
        onClose();
      } else {
        navigate(-1); 
      }
    } else {
      setLoader(false);
    }
  };

  return (
    <div className="text-center">
      <Row className="justify-center">
        <Col xs={24} sm={24} md={24} lg={24} xl={24} className="border-0 rounded">
          <Card bordered={false} className="criclebox h-full shadow-none p-0">
            {!passedUser && <Title level={3} className="m-3 text-center mb-5">Edit : {initValues.username}</Title>}
            
            <Form 
              initialValues={{ ...initValues }} 
              form={form} 
              layout="vertical" 
              onFinish={onFinish} 
              onFinishFailed={() => setLoader(false)}
            >
              <Row gutter={[16, 0]} className="text-left">
                {/* User Info */}
                <Col xs={24} md={12}><Form.Item label="First Name" name="firstName"><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Last Name" name="lastName"><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Username" name="username"><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Change Password" name="password"><Input.Password placeholder="Leave empty to keep old password" /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Email" name="email"><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Phone" name="phone"><Input /></Form.Item></Col>

                {/* Employee Details */}
                <Col xs={24} md={12}><Form.Item label="Joining Date" name="joinDate"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Leave Date" name="leaveDate"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Employee ID" name="employeeId"><Input /></Form.Item></Col>
                
                <Col xs={24} md={12}>
                  <Form.Item label="Blood Group" name="bloodGroup">
                    <Select allowClear placeholder="Select Blood Group">{["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => (<Option key={bg} value={bg}>{bg}</Option>))}</Select>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Department" name="departmentId">
                    <Select loading={!department} allowClear placeholder="Select Department">
                      {department?.map((dep) => (<Option key={dep.id} value={dep.id}>{dep.name}</Option>))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Employment Status" name="employmentStatusId">
                    <Select loading={!employmentStatus} allowClear placeholder="Select Status">
                      {employmentStatus?.map((status) => (<Option key={status.id} value={status.id}>{status.name}</Option>))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Designation" name="designationId">
                    <Select loading={!designation} showSearch optionFilterProp="children" allowClear placeholder="Select Designation">
                      {designation?.map((desg) => (<Option key={desg.id} value={desg.id}>{desg.name}</Option>))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Shift" name="shiftId">
                    <Select loading={!shift} allowClear placeholder="Select Shift">
                      {shift?.map((sh) => (<Option key={sh.id} value={sh.id}>{sh.name}</Option>))}
                    </Select>
                  </Form.Item>
                </Col>

                {(role === "admin" || role === "super-admin") && (
                  <Col xs={24} md={12}>
                    <Form.Item label="Staff Role" name={"roleId"}>
                      <Select allowClear placeholder="Select Role">
                        {list && list.map((role) => (<Option key={role.id} value={role.id}>{role.name}</Option>))}
                      </Select>
                    </Form.Item>
                  </Col>
                )}

                {/* Address Information */}
                <Col xs={24} md={12}><Form.Item label="Street" name="street"><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="City" name="city"><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="State" name="state"><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Zip Code" name="zipCode"><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Country" name="country"><Input /></Form.Item></Col>
              </Row>

              <Form.Item className="mt-4 mb-0">
                <Button loading={loader} block size="large" type="primary" htmlType="submit" shape="round">
                  Update Staff Information
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default UpdateStaff;