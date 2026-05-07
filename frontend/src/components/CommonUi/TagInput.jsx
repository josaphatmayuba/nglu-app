import { Input, Tag, Tooltip } from "antd";
import { useEffect, useRef, useState } from "react";
const TagInput = ({ tags, setTags, label }) => {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    editInputRef.current?.focus();
  }, [inputValue]);
  const handleClose = (removedTag) => {
    const newTags = tags.filter((tag) => tag !== removedTag);
    setTags(newTags);
  };

  const handleInputChange = (e) => {
    const value = e.target?.value;
    setInputValue(value);
  };
  const handleInputConfirm = () => {
    if (inputValue) {
      const emails = inputValue
        ? inputValue.split(",").map((email) => email.trim())
        : [];
      setTags([...tags, ...emails]);
    }

    setInputValue("");
  };

  return (
    <>
      <div className="pb-1">{label}</div>
      <div className="flex flex-wrap border overflow-hidden select-none rounded">
        {tags.map((tag, index) => {
          const isLongTag = tag.length > 20;
          const tagElem = (
            <Tag
              className="flex items-center justify-evenly "
              key={tag}
              closable={true}
              onClose={() => handleClose(tag)}
            >
              <span>{isLongTag ? `${tag.slice(0, 20)}...` : tag}</span>
            </Tag>
          );
          return isLongTag ? (
            <Tooltip title={tag} key={tag}>
              {tagElem}
            </Tooltip>
          ) : (
            tagElem
          );
        })}

        <Input
          className="min-w-[100px] w-auto flex-grow inline border-none top-0 focus:outline-none focus:ring-0"
          ref={inputRef}
          type="text"
          size="small"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputConfirm}
          onPressEnter={handleInputConfirm}
        />
      </div>
    </>
  );
};
export default TagInput;
