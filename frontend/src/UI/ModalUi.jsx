import { cn } from "@/utils/functions";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ModalUi({
  open,
  onClose,
  className,
  title,
  extra,
  children,
  button,
  closeIcon = true,
  outsideClick = true,
}) {
  const [openLocal, setOpen] = useState(false);

  useEffect(() => {
    if (openLocal || open)
      window.document.querySelector("body").style.overflowY = "hidden";
    return () => {
      window.document.querySelector("body").style.overflowY = "auto";
    };
  }, [open, openLocal]);

  const handleClose = () => {
    const close = () => {
      setOpen(false);
    };
    if (onClose) onClose(close);
    else close();
  };
  const handleClick = () => {
    setOpen(!open);
  };

  return (
    <>
      {button ? <span onClick={handleClick}>{button}</span> : null}
      {(openLocal || open) &&
        createPortal(
          <div className="h-screen w-screen absolute top-0 left-0 right-0 z-[31] bottom-0 flex items-center justify-center">
            <div
              onClick={outsideClick ? handleClose : null}
              className="absolute inset-0 bg-black opacity-70"></div>
            <div
              className={cn(
                `relative  bg-modalBg  min-w-[370px] w-screen md:w-auto h-full md:h-auto md:max-h-[90%]  md:rounded-md flex flex-col`,
                { [className]: className }
              )}>
              <div className="bg-modalBg flex justify-between items-start sticky top-0 md:rounded-t-md">
                <div
                  className={cn(
                    "text-lg font-semibold text-gray-600 select-none w-full",
                    {
                      "p-2": title,
                    }
                  )}>
                  {title}
                </div>

                {(extra || closeIcon) && (
                  <div className="flex  gap-2 p-2">
                    {extra || null}
                    {closeIcon && (
                      <button
                        className="p-2 rounded-md hover:bg-gray-200 hover:text-black"
                        onClick={handleClose}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-grow px-2 pb-2 overflow-y-auto overflow-x-hidden">
                {children}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
