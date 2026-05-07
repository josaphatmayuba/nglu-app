import { cn } from "@/utils/functions";
import { useState } from "react";

export default function Tabs({ children, className }) {
  const [activeTab, setActiveTab] = useState(children[0]?.props?.label);

  const handleClick = (e, newActiveTab) => {
    e.preventDefault();
    setActiveTab(newActiveTab);
  };

  return (
    <div className={cn("", { [className]: className })}>
      <ul className='ml-4 flex cursor-pointer gap-4'>
        {children.map((tab) => (
          <li
            key={tab.props.label}
            className={`py-2 relative px-4 text-sm border text-center rounded-t-md font-semibold text-gray-500  ${
              activeTab === tab.props.label
                ? "text-blue-500 border-b-white border-b-2"
                : "border-transparent"
            } hover:text-blue-500`}
            onClick={(e) => handleClick(e, tab.props.label)}
          >
            {tab.props.label}
            {activeTab === tab.props.label && (
              <div className='absolute -bottom-[3px] left-0 w-full h-1 bg-white'></div>
            )}
          </li>
        ))}
      </ul>
      <div className='border-t  '>
        {children.map((one) => {
          if (one.props.label === activeTab)
            return <div key={one.props.label}>{one.props.children}</div>;
          else return null;
        })}
      </div>
    </div>
  );
}

export const Tab = ({ children }) => {
  return <>{children}</>;
};
