import { Select } from "antd";

export default function FilterVatTax({ setPageConfig }) {
  const handleChange = (value, name) => {
    setPageConfig((prev) => {
      return {
        ...prev,
        [name]: value,
        page: 1,
      };
    });
  };
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
  return (
    <div className='flex items-center gap-2'>
      <div className='filterTag float-left min-w-[85px] max-w-[150px]'>
        <Select
          placeholder='Status'
          className=''
          showSearch={false}
          mode='multiple'
          style={{ width: "100%" }}
          maxTagPlaceholder={(item) => (
            <div className=''>{item.length} Selected</div>
          )}
          maxTagCount={0}
          onChange={(value) => handleChange(value, "status")}
        >
          <Select.Option key={"true"} value={"true"}>
            Show
          </Select.Option>
          <Select.Option key={"false"} value={"false"}>
            Hide
          </Select.Option>
        </Select>
      </div>
    </div>
  );
}
