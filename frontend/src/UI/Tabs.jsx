import { cn } from "@/utils/functions";
import { Children, useEffect, useMemo, useState } from "react";

export default function Tabs({ children, className }) {
  const tabs = useMemo(() => Children.toArray(children), [children]);
  const getTabKey = (tab, index) => tab.props.tabKey ?? tab.key ?? `tab-${index}`;
  const [activeTab, setActiveTab] = useState(() =>
    tabs[0] ? getTabKey(tabs[0], 0) : null
  );

  useEffect(() => {
    if (!tabs.length) return;

    const hasActiveTab = tabs.some((tab, index) => getTabKey(tab, index) === activeTab);
    if (!hasActiveTab) {
      setActiveTab(getTabKey(tabs[0], 0));
    }
  }, [activeTab, tabs]);

  const handleClick = (e, newActiveTab) => {
    e.preventDefault();
    setActiveTab(newActiveTab);
  };

  return (
    <div className={cn("", { [className]: className })}>
      <ul className='flex cursor-pointer gap-1 overflow-x-auto border-b border-ink-200 px-3'>
        {tabs.map((tab, index) => {
          const tabKey = getTabKey(tab, index);
          const isActive = activeTab === tabKey;

          return (
            <li
              key={tabKey}
              className={`relative whitespace-nowrap rounded-t-lg border px-4 py-3 text-center text-sm font-semibold transition-colors ${
                isActive
                  ? "border-ink-200 border-b-white bg-white text-primary"
                  : "border-transparent text-ink-500 hover:bg-ink-50 hover:text-ink-800"
              }`}
              onClick={(e) => handleClick(e, tabKey)}
            >
              {tab.props.label}
              {isActive && (
                <div className='absolute -bottom-[1px] left-0 h-[2px] w-full bg-white'></div>
              )}
            </li>
          );
        })}
      </ul>
      <div>
        {tabs.map((one, index) => {
          const tabKey = getTabKey(one, index);
          if (tabKey === activeTab)
            return <div key={`${tabKey}-panel`}>{one.props.children}</div>;
          return null;
        })}
      </div>
    </div>
  );
}

export const Tab = ({ children }) => {
  return <>{children}</>;
};
