import { useState } from "react";
import { Search } from "lucide-react";

export default function CommonSearch({ setPageConfig }) {
  const [inputValue, setInputValue] = useState("");

  const onSearchChange = (e) => {
    if (e.target.value === "") {
      setPageConfig((prev) => {
        return prev.key ? { page: 1, count: 10 } : prev;
      });
    }
    setInputValue(e.target.value);
  };

  const onSearch = () => {
    if (inputValue !== "") {
      setPageConfig((prev) => {
        return {
          ...prev,
          key: inputValue,
        };
      });
    }
  };

  return (
    <div className='common-search relative w-full'>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        className="h-9 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        placeholder="Rechercher..."
        value={inputValue}
        onChange={onSearchChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch();
        }}
      />
    </div>
  );
}
