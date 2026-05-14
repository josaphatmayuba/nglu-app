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
          <div className="h-screen w-screen fixed top-0 left-0 right-0 z-[31] bottom-0 flex items-center justify-center p-4">
            <div
              onClick={outsideClick ? handleClose : null}
              className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"></div>
            <div
              className={cn(
                `relative bg-white min-w-[320px] w-full md:w-auto max-h-[90vh] rounded-2xl border border-ink-200 shadow-2xl flex flex-col overflow-hidden`,
                { [className]: className }
              )}>
              <div className="bg-white flex justify-between items-center sticky top-0 border-b border-ink-100 rounded-t-2xl">
                <div
                  className={cn(
                    "text-base font-semibold text-ink-900 select-none w-full",
                    {
                      "px-5 py-4": title,
                    }
                  )}>
                  {title}
                </div>

                {(extra || closeIcon) && (
                  <div className="flex items-center gap-1 px-3 py-2">
                    {extra || null}
                    {closeIcon && (
                      <button
                        className="p-1.5 rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-900 transition"
                        onClick={handleClose}
                        aria-label="Fermer">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-grow px-5 py-4 overflow-y-auto overflow-x-hidden">
                {children}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
