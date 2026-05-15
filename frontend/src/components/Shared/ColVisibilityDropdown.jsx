import { Select, Tag } from "antd";
import { Columns3 } from "lucide-react";

const tagRender = (props) => {
  const { label, closable, onClose } = props;
  const onPreventMouseDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  return (
    <Tag
      onMouseDown={onPreventMouseDown}
      closable={closable}
      onClose={onClose}
      style={{
        marginRight: 3,
      }}
    >
      {label}
    </Tag>
  );
};

const ColVisibilityDropdown = ({ options, columns, columnsToShowHandler }) => {
  const localOptions = options.filter((option) => option.title?.length >= 2);
  const modOptions = localOptions.map((option) => {
    return {
      id: option.id,
      value: option.title,
    };
  });

  const defaultValue = modOptions.map((option) => {
    return option.value;
  });

  const handleChange = (selectedCols) => {
    const columnsToShow = columns.filter((column) => {
      const colFound = selectedCols.find(
        (selectedCol) => column.title === selectedCol
      );
      return colFound;
    });

    columnsToShowHandler(columnsToShow);
  };

  return (
    <div className='min-w-[120px] md:max-w-[165px] w-1/2 md:w-auto'>
      <Select
        mode='multiple'
        tagRender={tagRender}
        defaultValue={defaultValue}
        maxTagCount={0}
        options={modOptions}
        maxTagPlaceholder={
          <span className="inline-flex items-center gap-1">
            <Columns3 size={14} /> Colonnes
          </span>
        }
        placeholder='Colonnes'
        onChange={handleChange}
        popupClassName='w-[200px]'
        showSearch={false}
      />
    </div>
  );
};
export default ColVisibilityDropdown;
