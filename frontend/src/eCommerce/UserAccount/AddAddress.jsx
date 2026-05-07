import { Button, Form, Input, Radio, Select } from 'antd';
import React from 'react'
import { useState } from 'react';

export default function AddAddress() {
    const onFinish = () => {
        
    }
    const Province = ["Chattogram", "Dhaka", "Khulna", "Mymensingh", "Rajshahi", "Rangpur", "Sylhet"]
     const [value, setValue] = useState(1);
  return (
    <div className="p-3 mt-10 ">
      <div>
        <Form
          name="login"
          layout="vertical"
          initialValues={{
            remember: false,
          }}
          onFinish={onFinish}
          autoComplete="off"
        >
          <div className=" md:flex justify-between gap-5 ">
            <div className="md:w-1/2">
              <Form.Item
                label="Full Name"
                name="Name"
                className="-mt-4"
                rules={[
                  {
                    required: true,
                    message: "Please select  your name!",
                  },
                ]}
              >
                <Input className="p-[9px]" placeholder="Enter Full Name" />
              </Form.Item>

              <Form.Item
                label="Province"
                name="province"
                className="-mt-4 bg-white"
                rules={[
                  {
                    required: true,
                    message: "Please select  your province!",
                  },
                ]}
              >
                <Select
                  name="province"
                  placeholder="Please select  your province"
                >
                  {Province &&
                    Province.map((p, index) => (
                      <Select.Option key={index}>{p}</Select.Option>
                    ))}
                </Select>
              </Form.Item>
              <Form.Item
                label="City"
                name="city"
                className="-mt-4 "
                rules={[
                  {
                    required: true,
                    message: "Please select  your city!",
                  },
                ]}
              >
                <Select name="city" placeholder="Please select  your city">
                  {Province &&
                    Province.map((p, index) => (
                      <Select.Option key={index}>{p}</Select.Option>
                    ))}
                </Select>
              </Form.Item>
              <Form.Item
                label="Area"
                name="area"
                className="-mt-4 "
                rules={[
                  {
                    required: true,
                    message: "Please select  your Area!",
                  },
                ]}
              >
                <Select name="area" placeholder="Please select  your area">
                  {Province &&
                    Province.map((p, index) => (
                      <Select.Option key={index}>{p}</Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </div>
            <div className="md:w-1/2">
              <Form.Item
                label="Phone"
                name="phone"
                className="-mt-4"
                rules={[
                  {
                    required: true,
                    message: "Please  input your valid phone number!",
                  },
                ]}
              >
                <Input className="p-[9px]" placeholder="Input Valid Phone " />
              </Form.Item>
              <Form.Item
                label="Address"
                name="address"
                className="-mt-4"
                rules={[
                  {
                    required: true,
                    message: "Please  input your Address!",
                  },
                ]}
              >
                <Input
                  className="p-[9px]"
                  placeholder="House No / Building / Street / Area"
                />
              </Form.Item>
              <Form.Item
                label="Landmark (Option)"
                name="landmark "
                className="-mt-2"
              >
                <Input className="p-[9px]" />
              </Form.Item>
              <Form.Item
                label="Select a label for effective delivery:"
                name="delivery"
                className="-mt-2"
              >
                <Radio.Group value={value}>
                  <Radio value={1}>Home</Radio>
                  <Radio value={2}>Office</Radio>
                </Radio.Group>
              </Form.Item>
            </div>
          </div>
          <Form.Item className="md:flex justify-end my-3">
            <Button
              className="w-full md:w-[200px] text-white font-medium bg-ePrimary"
              htmlType="submit"
            >
              Update
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
