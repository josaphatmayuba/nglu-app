import { useState } from "react";

export default function Pagination({
  defaultPageStart = 1,
  total = 1,
  defaultPageSize = 10,
  onChange,
}) {
  const [itemsPerPage, setItemsPerPage] = useState(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(defaultPageStart);

  const totalPages = Math.ceil(total / itemsPerPage);
  const pages = Array.from(Array(totalPages).keys()).map((page) => page + 1);

  // Calculate the range of visible pages
  const maxVisiblePages = 3;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  const visiblePages = pages.slice(startPage - 1, endPage);

  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = parseInt(e.target.value, 10);
    setItemsPerPage(newItemsPerPage);
    onChange && onChange(1, newItemsPerPage);
    setCurrentPage(1);
  };

  const handleOnPageChange = (page, count) => {
    onChange && onChange(page, count);
    setCurrentPage(page);
  };

  return (
    <nav className='flex items-center gap-3'>
      <ul className='flex space-x-2'>
        <li>
          <button
            disabled={currentPage <= 1}
            onClick={() => handleOnPageChange(currentPage - 1, itemsPerPage)}
            className='flex items-center justify-center w-8 h-8 rounded-md bg-gray-200 hover:bg-gray-300 focus:outline-none'
          >
            <FiChevronLeft className='w-5 h-5 text-gray-700' />
          </button>
        </li>

        {visiblePages.map((page) => (
          <li key={page}>
            <button
              onClick={() => handleOnPageChange(page, itemsPerPage)}
              className={`flex items-center justify-center w-8 h-8 rounded-md ${
                currentPage === page
                  ? "bg-primary text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              } focus:outline-none`}
            >
              {page}
            </button>
          </li>
        ))}

        <li>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => handleOnPageChange(currentPage + 1, itemsPerPage)}
            className='flex items-center justify-center w-8 h-8 rounded-md bg-gray-200 hover:bg-gray-300 focus:outline-none'
          >
            <FiChevronRight className='w-5 h-5 text-gray-700' />
          </button>
        </li>
      </ul>

      <div>
        <select
          id='itemsPerPage'
          className='h-8 min-w-[110px] px-2 py-1 border border-gray-300 rounded focus:outline-none'
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
        >
          <option value='10'>10/Page</option>
          <option value='20'>20/Page</option>
          <option value='50'>50/Page</option>
          <option value='100'>100/Page</option>
        </select>
      </div>
    </nav>
  );
}

export function FiChevronLeft(props) {
  return (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth={2}
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      height='1em'
      width='1em'
      {...props}
    >
      <polyline points='15 18 9 12 15 6' />
    </svg>
  );
}

export function FiChevronRight(props) {
  return (
    <svg
      stroke='currentColor'
      fill='none'
      strokeWidth={2}
      viewBox='0 0 24 24'
      strokeLinecap='round'
      strokeLinejoin='round'
      height='1em'
      width='1em'
      {...props}
    >
      <polyline points='9 18 15 12 9 6' />
    </svg>
  );
}
