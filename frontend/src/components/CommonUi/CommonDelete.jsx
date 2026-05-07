import { cn } from "@/utils/functions";
import { DeleteOutlined } from "@ant-design/icons";
import toast from "react-hot-toast";
import { BiShow } from "react-icons/bi";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";

export default function CommonDelete({
  permission,
  title,
  deleteThunk,
  id,
  values,
  navigatePath,
  className,
  loadThunk,
  query,
  icon,
  onSuccess,
  button,
}) {
  const demo = import.meta.env.VITE_APP_VERSION;

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const onDelete = async () => {
    if (demo === "demo") {
      toast.error(
        "This is a demo version. You can not hide or delete anything.",
      );
      return;
    }
    var result = window.confirm(
      `Are you sure you want to ${
        values?.status === "true" ? "hide" : "show"
      }?`,
    );
    if (result) {
      const res = await dispatch(
        deleteThunk(
          id
            ? id
            : {
                ...values,
                status: values?.status === "true" ? "false" : "true",
              },
        ),
      );
      if (res.payload?.message === "success") {
        navigatePath && navigate(navigatePath);
        loadThunk && dispatch(loadThunk(query && query));
        onSuccess && onSuccess();
      }
    }
  };
  return (
    <>
      <UserPrivateComponent permission={permission}>
        {!button && (
          <>
            {icon ? (
              <div className="flex items-center gap-2">
                <span className="cursor-pointer" onClick={() => onDelete()}>
                  {icon}
                </span>
                {title || null}
              </div>
            ) : (
              <div
                onClick={() => onDelete()}
                className={`flex items-center  gap-2 group ${
                  values?.status === "true" || title === "Delete"
                    ? "hover:text-red-500"
                    : "hover:text-primary"
                }`}>
                {values?.status === "false" ? (
                  <BiShow />
                ) : (
                  <DeleteOutlined
                    className={cn(
                      ` inline-block rounded-md group-hover:text-red-500`,
                      {
                        [className]: className,
                      },
                    )}
                  />
                )}
                {title || null}
              </div>
            )}
          </>
        )}

        {button && (
          <div className="cursor-pointer" onClick={() => onDelete()}>
            {button}
          </div>
        )}
      </UserPrivateComponent>
    </>
  );
}
