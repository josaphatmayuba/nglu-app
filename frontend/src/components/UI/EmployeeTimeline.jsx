import dayjs from "dayjs";
import React from "react";
import { useParams } from "react-router-dom";
import { deleteEducation } from "../../redux/rtk/features/education/educationSlice";
import { loadSingleStaff } from "../../redux/rtk/features/user/userSlice";
import CommonDelete from "../CommonUi/CommonDelete";
import BtnDeleteSvg from "./Button/btnDeleteSvg";
import EducationEditSinglePopup from "./PopUp/PopUp/EducationEditSinglePopup";
import TimeLineSvg from "./TimeLineSvg";

const EmployeeTimeline = ({ list, edit, setLoading }) => {
  const { id } = useParams("id");
  return (
    <div>
      <main className='container mx-auto w-full flex justify-center mt-5 px-4'>
        <ol className='border-l-2 border-slate-600 w-full max-w-4xl'>
          {list &&
            list?.map((item) => {
              return (
                <li key={item.id}>
                  <div className='md:flex flex-start'>
                    <TimeLineSvg />
                    <div className='block p-4 sm:p-6 max-w-full sm:max-w-md ml-4 sm:ml-6 mb-5'>
                      <div className='flex flex-col sm:flex-row justify-between mb-4 gap-2'>
                        <h3 className='font-medium text-sm sm:text-base mr-0 sm:mr-20 w-full sm:w-500 txt-color-2'>
                          {item?.degree || "No Degree"}
                        </h3>

                        <h3 className='font-medium text-sm sm:text-base mr-0 sm:mr-20 w-full sm:w-500 txt-color-2'>
                          {dayjs(item?.studyStartDate).format("MMM YYYY")} -{" "}
                          {item?.studyEndDate
                            ? dayjs(item?.studyEndDate).format("MMM YYYY")
                            : "Present"}
                        </h3>
                        {edit && (
                          <div className='flex gap-2 mt-2 sm:mt-0'>
                            <EducationEditSinglePopup
                              data={item}
                              setLoading={setLoading}
                            />
                            <CommonDelete
                              permission={"delete-education"}
                              icon={
                                <button>
                                  <BtnDeleteSvg size={20} />
                                </button>
                              }
                              deleteThunk={deleteEducation}
                              id={item.id}
                              loadThunk={loadSingleStaff}
                              query={id}
                            />
                          </div>
                        )}
                      </div>

                      <h3 className='font-medium text-xs sm:text-sm mr-0 sm:mr-20 w-full sm:w-500 txt-color-2'>
                        Field of Study :{" "}
                        <span className='font-medium text-xs sm:text-sm txt-color-secondary'>
                          {item?.fieldOfStudy}
                        </span>
                      </h3>

                      <h3 className='font-medium text-xs sm:text-sm mr-0 sm:mr-20 w-full sm:w-500 txt-color-2'>
                        Institute :{" "}
                        <span className='font-medium text-xs sm:text-sm txt-color-secondary'>
                          {item?.institution}
                        </span>
                      </h3>

                      <h3 className='font-medium text-xs sm:text-sm mr-0 sm:mr-20 w-full sm:w-500 txt-color-2'>
                        Result :{" "}
                        <span className='font-medium text-xs sm:text-sm txt-color-secondary'>
                          {item?.result}
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

export default EmployeeTimeline;
