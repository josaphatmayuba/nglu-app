import { Button, Col, DatePicker, Form, Input, InputNumber, Row, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { loadAllDepartment } from "../../redux/rtk/features/department/departmentSlice";
import { loadAllDesignation } from "../../redux/rtk/features/designation/designationSlice";
import { loadAllEmployeeStatus } from "../../redux/rtk/features/employeeStatus/employeeStatusSlice";
import { loadAllRole } from "../../redux/rtk/features/hr/role/roleSlice";
import { loadAllShift } from "../../redux/rtk/features/shift/shiftSlice";
import { addStaff, loadAllStaff } from "../../redux/rtk/features/user/userSlice";
import EmployeeEducationForm from "./EmployeeEducationForm";

const AddStaff = () => {
  const { Option } = Select;
  const dispatch = useDispatch();
  const [loader, setLoader] = useState(false);
  const { list } = useSelector((state) => state.role);
  const { list: department } = useSelector((state) => state.department);
  const { list: designation } = useSelector((state) => state.designations);
  const { list: employmentStatus } = useSelector((state) => state.employmentStatus);
  const { list: shift } = useSelector((state) => state.shift);

  const [form] = Form.useForm();

  const onFinish = async (values) => {
    try {
      setLoader(true);
      // ✅ Fix: Date formatting applied before sending to backend
      const formattedValues = {
        ...values,
        joinDate: values.joinDate ? dayjs(values.joinDate).format("YYYY-MM-DD") : null,
        leaveDate: values.leaveDate ? dayjs(values.leaveDate).format("YYYY-MM-DD") : null,
        designationStartDate: values.designationStartDate ? dayjs(values.designationStartDate).format("YYYY-MM-DD") : null,
        designationEndDate: values.designationEndDate ? dayjs(values.designationEndDate).format("YYYY-MM-DD") : null,
        salaryStartDate: values.salaryStartDate ? dayjs(values.salaryStartDate).format("YYYY-MM-DD") : null,
        salaryEndDate: values.salaryEndDate ? dayjs(values.salaryEndDate).format("YYYY-MM-DD") : null,
        education: values.education?.map((edu) => ({
          ...edu,
          studyStartDate: edu.studyStartDate ? dayjs(edu.studyStartDate).format("YYYY-MM-DD") : null,
          studyEndDate: edu.studyEndDate ? dayjs(edu.studyEndDate).format("YYYY-MM-DD") : null,
        })),
      };

      const resp = await dispatch(addStaff(formattedValues));

      if (resp.payload?.message === "success" || resp.payload?.id) {
        form.resetFields();
        dispatch(loadAllStaff({ status: "true", count: 10, page: 1 }));
      }
      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  };

  const onFinishFailed = () => { };

  const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

  useEffect(() => {
    dispatch(loadAllRole());
    dispatch(loadAllDepartment());
    dispatch(loadAllDesignation({ query: "all" }));
    dispatch(loadAllShift());
    dispatch(loadAllEmployeeStatus());
  }, [dispatch]);

  return (
    <>
      <div className="mr-top mt-5 p-5 ant-card " style={{ maxWidth: "100%" }}>
        <Form
          size="small"
          form={form}
          name="basic"
          labelCol={{ span: 7 }}
          wrapperCol={{ span: 22 }}
          initialValues={{ remember: true }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off">
          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
            <Col span={12} className="gutter-row form-color">
              <h2 className="text-center text-xl mt-3 mb-3 txt-color">User Information</h2>
              <Form.Item style={{ marginBottom: "10px" }} label="First Name" name="firstName" rules={[{ required: true, message: "Please input First Name!" }]}>
                <Input placeholder="John" />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="Last Name" name="lastName" rules={[{ required: true, message: "Please input Last Name!" }]}>
                <Input placeholder="Doe" />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="User Name" name="username" rules={[{ required: true, message: "Please input User Name!" }]}>
                <Input placeholder="john_doe" />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="Password" name="password" rules={[{ required: true, message: "Please input your password !" }]}>
                <Input.Password placeholder="Strong Password" />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="Email" name="email">
                <Input placeholder="johndoe2@example.com" />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="Phone" name="phone">
                <Input placeholder="015000000000" />
              </Form.Item>
            </Col>

            <Col span={12} className="gutter-row">
              <h2 className="text-center text-xl mt-3 mb-3 txt-color">Address Information</h2>
              <Form.Item style={{ marginBottom: "10px" }} label="Street" name="street">
                <Input placeholder="123 Main Street" />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="City" name="city">
                <Input placeholder="Los Angeles" />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="State" name="state">
                <Input placeholder="CA" />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="Zip Code" name="zipCode">
                <Input placeholder="90211" />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="Country" name="country">
                <Input placeholder="USA" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
            <Col span={12} className="gutter-row">
              <h2 className="text-center text-xl mt-3 mb-3 txt-color">Employee Information</h2>
              <Form.Item style={{ marginBottom: "10px" }} label="Joining Date" name="joinDate">
                <DatePicker className="date-picker hr-staffs-date-picker" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="Leave Date" name="leaveDate">
                <DatePicker className="date-picker hr-staffs-date-picker" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="Employee ID" name="employeeId">
                <Input placeholder="OE-012" />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="Blood Group" name="bloodGroup">
                <Select placeholder="Select Blood Group" allowClear size="middle" mode="single" style={{ width: "100%" }}>
                  {bloodGroups.map((bloodGroup) => (<Option key={bloodGroup} value={bloodGroup}>{bloodGroup}</Option>))}
                </Select>
              </Form.Item>
              <Form.Item name={"employmentStatusId"} style={{ marginBottom: "10px" }} label="Employee Status">
                <Select placeholder="Select Status" allowClear size="middle">
                  {employmentStatus?.map((employmentStatus) => (<Option key={employmentStatus.id} value={employmentStatus.id}>{employmentStatus.name}</Option>))}
                </Select>
              </Form.Item>
              <Form.Item name={"departmentId"} style={{ marginBottom: "10px" }} label="Department">
                <Select loading={!department} placeholder="Select Department" size="middle" allowClear>
                  {department?.map((department) => (<Option key={department.id} value={department.id}>{department.name}</Option>))}
                </Select>
              </Form.Item>
              <Form.Item rules={[{ required: true, message: "Please input Role!" }]} label="Role" name={"roleId"} style={{ marginBottom: "10px" }}>
                <Select loading={!list} mode="single" size="middle" allowClear style={{ width: "100%" }} placeholder="Please select">
                  {list?.map((role) => (<Option key={role.id} value={role.id}>{role.name}</Option>))}
                </Select>
              </Form.Item>
              <Form.Item rules={[{ required: true, message: "Please input Shift!" }]} label="Shift" name={"shiftId"} style={{ marginBottom: "10px" }}>
                <Select loading={!shift} mode="single" size="middle" allowClear style={{ width: "100%" }} placeholder="Please select">
                  {shift?.map((shift) => (<Option key={shift.id} value={shift.id}>{shift.name}</Option>))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12} className="gutter-row">
              <h2 className="text-center text-xl mt-3 mb-3 txt-color">Designation & Salary Information</h2>
              <Form.Item label="Designation" name={"designationId"} style={{ marginBottom: "10px" }}>
                <Select loading={!designation} mode="single" size="middle" allowClear style={{ width: "100%" }} placeholder="Please select Designation">
                  {designation?.map((designation) => (<Option key={designation.id} value={designation.id}>{designation.name}</Option>))}
                </Select>
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="Designation Start Date" name="designationStartDate">
                <DatePicker className="date-picker hr-staffs-date-picker" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="Designation End Date" name="designationEndDate">
                <DatePicker className="date-picker hr-staffs-date-picker" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="Salary" name="salary" rules={[{ required: true, message: "Please input salary" }]}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label="Salary Start Date" name="salaryStartDate" style={{ marginBottom: "10px" }}>
                <DatePicker className="date-picker hr-staffs-date-picker" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="Salary End Date" name="salaryEndDate">
                <DatePicker className="date-picker hr-staffs-date-picker" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item style={{ marginBottom: "10px" }} label="Salary Comment" name="salaryComment">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <h2 className="text-center text-xl mt-3 mb-5 txt-color">Education Information</h2>
          <Form.List name="education">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <EmployeeEducationForm key={key} name={name} remove={remove} restField={restField} />
                ))}
                <Form.Item style={{ marginBottom: "10px" }} wrapperCol={{ offset: 4, span: 16 }}>
                  <Button type="dashed" style={{ color: "#fff", backgroundColor: "#2c3e50" }} onClick={() => add()} block icon={<PlusOutlined />}>
                    Add Education Information
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item style={{ marginBottom: "10px", marginTop: "10px" }} wrapperCol={{ offset: 4, span: 16 }}>
            <Button className="mt-5" size="large" block type="primary" htmlType="submit" shape="round" loading={loader}>
              Add New Staff
            </Button>
          </Form.Item>
        </Form>
      </div>
    </>
  );
};

export default AddStaff;