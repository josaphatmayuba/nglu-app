import dayjs from "dayjs";
import React from "react";
import { useParams } from "react-router-dom";
import { deleteDesignationHistory } from "../../redux/rtk/features/designationHistory/designationHistorySlice";
import { loadSingleStaff } from "../../redux/rtk/features/user/userSlice";
import CommonDelete from "../CommonUi/CommonDelete";
import BtnDeleteSvg from "./Button/btnDeleteSvg";
import DesignationTimelineSvg from "./DesignationTimelineSVG";
import DesignationEditSinglePopup from "./PopUp/PopUp/DesignationEditSinglePopup";

const EmployeeDesignation = ({ list, edit, setLoading }) => {
  const { id } = useParams("id");

  return (
    <div>
      <main className='container mx-auto w-full flex justify-center mt-5 px-4'>
        <ol className='border-l-2 border-slate-600 w-full max-w-4xl'>
          {list &&
            list?.map((item, index) => {
              return (
                <li key={index}>
                  <div className='md:flex flex-start'>
                    <DesignationTimelineSvg />
                    <div className='block p-4 sm:p-6 max-w-full sm:max-w-md ml-4 sm:ml-6 mb-5'>
                      <div className='flex flex-col sm:flex-row justify-between mb-4 gap-2'>
                        <h3 className='font-medium text-sm sm:text-base mr-0 sm:mr-20 w-full sm:w-500 txt-color-2'>
                          {item?.designation?.name}
                        </h3>

                        <h3 className='font-medium text-sm sm:text-base mr-0 sm:mr-20 w-full sm:w-500 txt-color-2'>
                          {dayjs(item?.startDate).format("MMM YYYY")} -{" "}
                          {item?.endDate
                            ? dayjs(item?.endDate).format("MMM YYYY")
                            : "Present"}
                        </h3>

                        {edit && (
                          <div className='flex gap-2 mt-2 sm:mt-0'>
                            <DesignationEditSinglePopup
                              data={item}
                              setLoading={setLoading}
                            />

                            <CommonDelete
                              permission={"delete-designationHistory"}
                              icon={
                                <button>
                                  <BtnDeleteSvg size={20} />
                                </button>
                              }
                              deleteThunk={deleteDesignationHistory}
                              id={item.id}
                              loadThunk={loadSingleStaff}
                              query={id}
                            />
                          </div>
                        )}
                      </div>

                      <h3 className='font-medium text-xs sm:text-sm mr-0 sm:mr-20 w-full sm:w-500 txt-color-2'>
                        Comment :{" "}
                        <span className='font-medium text-xs sm:text-sm txt-color-secondary'>
                          {item?.comment}
                        </span>
                      </h3>
                      <h3 className='font-medium text-xs sm:text-sm mr-0 sm:mr-20 w-full sm:w-500 txt-color-2'>
                        Start Date :{" "}
                        <span className='font-medium text-xs sm:text-sm txt-color-secondary'>
                          {" "}
                          {dayjs(item?.startDate).format("DD/MM/YYYY")}
                        </span>
                      </h3>

                      <h3 className='font-medium text-xs sm:text-sm mr-0 sm:mr-20 w-full sm:w-500 txt-color-2'>
                        End Date :{" "}
                        <span className='font-medium text-xs sm:text-sm txt-color-secondary'>
                          {item?.endDate
                            ? dayjs(item?.endDate).format("DD/MM/YYYY")
                            : "Present"}
                        </span>
                      </h3>
                    </div>
                  </div>
                </li>
              );
            })}
        </ol>
      </main>
    </div>
  );
};

export default EmployeeDesignation;
