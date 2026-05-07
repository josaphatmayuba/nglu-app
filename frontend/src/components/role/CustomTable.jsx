import { addPermission } from "@/redux/rtk/features/hr/role/permissionSlice";
import { loadSingleRole } from "@/redux/rtk/features/hr/role/roleSlice";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";

function dataTransform(data) {
  if (!Array.isArray(data)) return {};

  function convertToReadableText(inputString) {
    const words = inputString.match(/[A-Z]?[a-z]+/g) || [];
    const readableText = words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    return readableText;
  }

  const permissionNameArray = data
    .filter((item) => item.name.includes("create"))
    .map((item) => item.name.replace("create-", ""));

  const temp = {};

  permissionNameArray.forEach((name) => {
    const newArr = data.filter((item) => item.name.split("-")[1] === name);
    newArr.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();

      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

    temp[convertToReadableText(name)] = newArr;
  });

  return temp;
}

const CustomTable = ({ role, onSubmit }) => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const [loading, setLoading] = useState();
  const [selectedIds, setSelectedIds] = useState([]);

  const { list: permissions } = useSelector((state) => state.permission);

  const data = useMemo(() => dataTransform(permissions), [permissions]);

  const handleChange = async (newId, checked) => {
    setLoading(true);
    let newIds = role.map((item) => item.permissionId);

    if (checked) {
      newIds.push(newId);
    } else {
      newIds = newIds.filter((item) => item !== newId);
    }
    const resp = await dispatch(
      addPermission({ roleId: parseInt(id), permissionId: newIds })
    );
    if (resp.payload.message === "success") {
      dispatch(loadSingleRole(id));
    }
    setLoading(false);
  };

  const handleSelectRow = (i) => {
    const a = data[i].map((item) => item.id);
    setSelectedIds((prev) => {
      const localData = [...prev];
      a.forEach((item) => {
        const index = localData.indexOf(item);
        if (index !== -1) {
          localData.splice(index, 1);
        }
      });

      const newArray = localData.concat(a);
      return newArray;
    });
  };

  const handleSelectCol = (rowName) => {
    setSelectedIds((prev) => {
      const localData = [...prev];
      const a = permissions
        ?.filter((item) => item.name.includes(rowName))
        .map((item) => item.id);

      a.forEach((item) => {
        const index = localData.indexOf(item);
        if (index !== -1) {
          localData.splice(index, 1);
        }
      });

      const newArray = localData.concat(a);
      return newArray;
    });
  };

  useEffect(() => {
    setSelectedIds(role.map((item) => item.permissionId));
  }, [role]);

  return;
};

export default CustomTable;
