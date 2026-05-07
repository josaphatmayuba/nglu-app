import { Alert, Badge, Button, Empty, Tooltip } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  FiChevronDown,
  FiChevronRight,
  FiInfo,
  FiLayers,
  FiLock,
  FiSettings,
  FiShield,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";

import Card from "@/UI/Card";
import Loader from "../loader/loader";

import {
  addPermission,
  loadAllPermission,
} from "@/redux/rtk/features/hr/role/permissionSlice";
import {
  clearRole,
  loadSingleRole,
} from "@/redux/rtk/features/hr/role/roleSlice";

const DetailRole = () => {
  const { id } = useParams();
  const dispatch = useDispatch();

  const [selectedIds, setSelectedIds] = useState([]);
  const [disabled, setChanged] = useState(true);
  const [loader, setLoader] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { list: permissions } = useSelector((state) => state.permission);
  const { role, loading } = useSelector((state) => state.role);

  const data = useMemo(() => dataTransform(permissions), [permissions]);

  const handleSelectAllForType = (type, checked) => {
    const ids = [
      ...data[type].main.map((item) => item.id),
      ...data[type].related.map((item) => item.id),
    ];
    setSelectedIds((prev) => {
      let updated = [...prev];
      if (checked) {
        ids.forEach((id) => {
          if (!updated.includes(id)) updated.push(id);
        });
      } else {
        updated = updated.filter((id) => !ids.includes(id));
      }
      return updated;
    });
  };

  const handleChange = (newId) => {
    setSelectedIds((prev) => {
      const updated = [...prev];
      const index = updated.indexOf(newId);
      if (index !== -1) {
        updated.splice(index, 1);
      } else {
        updated.push(newId);
      }
      return updated;
    });
  };

  const toggleSection = (type) => {
    setOpenSections((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const onSubmit = async () => {
    setLoader(true);
    const resp = await dispatch(
      addPermission({ roleId: parseInt(id), permissionId: selectedIds })
    );
    if (resp.payload.message === "success") {
      dispatch(loadSingleRole(id));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setLoader(false);
  };

  useEffect(() => {
    role &&
      setSelectedIds(role?.rolePermission.map((item) => item.permissionId));
  }, [role]);

  useEffect(() => {
    dispatch(loadSingleRole(id));
    dispatch(loadAllPermission());
    return () => {
      dispatch(clearRole());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (role) {
      const realPermissions =
        role.rolePermission.map((item) => item.permissionId) || [];
      const localPermissions = [...selectedIds];
      realPermissions.sort();
      localPermissions.sort();
      setChanged(
        JSON.stringify(realPermissions) === JSON.stringify(localPermissions)
      );
    }
  }, [role, selectedIds]);

  if (loading) return <Loader />;

  const totalPermissions = Object.values(data).reduce(
    (sum, perms) => sum + perms.main.length + perms.related.length,
    0
  );
  const selectedPermissionsCount = selectedIds.length;

  // Get type icon based on permission type
  const getTypeIcon = (type) => {
    const typeMap = {
      Settings: <FiSettings />,
      Account: <FiLock />,
      Task: <FiLayers />,
    };
    return typeMap[type] || <FiShield />;
  };

  return (
    <Card
      className="max-md:border-0 max-md:bg-white rounded-lg"
      bodyClass="px-4"
      headClass="border-none bg-gray-50"
      title={
        <div className="flex items-center">
          <FiShield className="mr-2 text-blue-500" />
          <span className="font-semibold text-gray-800">
            Role Permissions: {role?.name}
          </span>
        </div>
      }
      extra={
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
          <div className="text-sm text-gray-500 flex items-center">
            <Badge
              status="processing"
              color={selectedPermissionsCount > 0 ? "#4096ff" : "#d9d9d9"}
            />
            <span className="ml-2">
              {selectedPermissionsCount} of {totalPermissions} permissions
            </span>
          </div>
          <Tooltip
            title={disabled ? "No changes detected" : "Save permission changes"}
          >
            <Button
              disabled={disabled}
              loading={loader}
              type="primary"
              onClick={onSubmit}
              icon={<FiLock size={14} className="mr-1" />}
              className="flex items-center"
              style={{ background: "#1677ff", borderColor: "#1677ff" }}
            >
              Update Permissions
            </Button>
          </Tooltip>
        </div>
      }
    >
      {saveSuccess && (
        <Alert
          message="Permissions updated successfully"
          type="success"
          showIcon
          className="mb-4"
          closable
        />
      )}

      <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100 shadow-sm">
        <div className="flex items-start">
          <FiInfo className="text-blue-500 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-blue-700">
              Managing Role Permissions
            </h3>
            <p className="text-sm text-blue-600 mt-1">
              Use the checkboxes to grant or revoke permissions for this role.
              Click on a category header to expand its permissions. Changes will
              only be applied after clicking the Update Permissions button.
            </p>
          </div>
        </div>
      </div>

      {Object.keys(data).length > 0 ? (
        <div className="space-y-5">
          {Object.entries(data).map(([type, perms]) => {
            const allChecked =
              perms.main.every((perm) => selectedIds.includes(perm.id)) &&
              perms.related.every((perm) => selectedIds.includes(perm.id));
            const someChecked =
              perms.main.some((perm) => selectedIds.includes(perm.id)) ||
              perms.related.some((perm) => selectedIds.includes(perm.id));
            const checkedCount =
              perms.main.filter((perm) => selectedIds.includes(perm.id))
                .length +
              perms.related.filter((perm) => selectedIds.includes(perm.id))
                .length;
            const isOpen = openSections[type];

            // Group related permissions by resource
            const relatedPermsByResource = perms.related.reduce((acc, perm) => {
              const [, resource] = perm.name.split("-");
              if (!acc[resource]) acc[resource] = [];
              acc[resource].push(perm);
              return acc;
            }, {});

            return (
              <div
                key={type}
                className="rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div
                  onClick={() => toggleSection(type)}
                  className={`relative flex justify-between items-center cursor-pointer p-4 transition-colors ${
                    isOpen
                      ? "bg-blue-50 border-b border-blue-100"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <FiChevronDown className="text-blue-500 text-lg flex-shrink-0" />
                    ) : (
                      <FiChevronRight className="text-gray-400 text-lg flex-shrink-0" />
                    )}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center"
                    >
                      <label className="flex items-center cursor-pointer">
                        <div className="relative">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={allChecked}
                            onChange={(e) =>
                              handleSelectAllForType(type, e.target.checked)
                            }
                          />
                          <div className="w-5 h-5 border-2 rounded transition-colors bg-white peer-checked:bg-blue-500 peer-checked:border-blue-500 border-gray-300">
                            {allChecked && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 text-white"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            {!allChecked && someChecked && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="ml-3 flex items-center">
                          <span className="text-lg font-medium capitalize text-gray-800">
                            {type}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {perms.related.length > 0 && (
                      <div className="hidden sm:flex items-center">
                        <div className="text-xs text-gray-500 flex flex-wrap gap-1">
                          <span>Related:</span>
                          {Object.keys(relatedPermsByResource).map(
                            (resource) => (
                              <span
                                key={resource}
                                className="bg-gray-100 px-2 py-0.5 rounded capitalize"
                              >
                                {resource}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                    <Badge
                      count={`${checkedCount}/${
                        perms.main.length + perms.related.length
                      }`}
                      style={{
                        backgroundColor: someChecked ? "#1677ff" : "#d9d9d9",
                        fontWeight: 500,
                      }}
                    />
                  </div>
                </div>

                {/* Mobile related permissions badges */}
                {!isOpen && perms.related.length > 0 && (
                  <div className="sm:hidden p-2 bg-gray-50 border-t border-gray-200">
                    <div className="flex flex-wrap gap-1 text-xs text-gray-500">
                      <span>Related:</span>
                      {Object.keys(relatedPermsByResource).map((resource) => (
                        <span
                          key={resource}
                          className="bg-gray-100 px-2 py-0.5 rounded capitalize"
                        >
                          {resource}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {isOpen && (
                  <div className="bg-white">
                    {/* Main Permissions */}
                    {perms.main.length > 0 && (
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-6 w-1 bg-blue-500 rounded-full"></div>
                          <p className="text-sm font-medium text-gray-600">
                            Core Permissions - Primary access controls for{" "}
                            {type} functionality
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {perms.main.map((perm) => {
                            const isChecked = selectedIds.includes(perm.id);
                            const actionType = perm.name.split("-")[0];
                            return (
                              <div
                                key={perm.id}
                                className={`border rounded-lg p-3 transition-all ${
                                  isChecked
                                    ? "bg-blue-50 border-blue-200 shadow-sm"
                                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                                } flex justify-between items-center`}
                              >
                                <div>
                                  <p className="text-sm font-medium text-gray-700">
                                    {formatPermissionName(perm.name)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {getPermissionDescription(actionType)}
                                  </p>
                                </div>
                                <label className="cursor-pointer">
                                  <div className="relative">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={isChecked}
                                      onChange={() => handleChange(perm.id)}
                                    />
                                    <div className="w-5 h-5 border-2 rounded transition-colors bg-white peer-checked:bg-blue-500 peer-checked:border-blue-500 border-gray-300">
                                      {isChecked && (
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-4 w-4 text-white"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Related Permissions */}
                    {perms.related.length > 0 && (
                      <div className="p-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-6 w-1 bg-green-500 rounded-full"></div>
                          <p className="text-sm font-medium text-gray-600">
                            Supporting Permissions - Additional access needed
                            for complete {type} workflows
                          </p>
                        </div>

                        <div className="space-y-6">
                          {Object.entries(relatedPermsByResource).map(
                            ([resource, group]) => {
                              const allChecked = group.every((perm) =>
                                selectedIds.includes(perm.id)
                              );
                              const someChecked = group.some((perm) =>
                                selectedIds.includes(perm.id)
                              );

                              const handleGroupToggle = (checked) => {
                                const ids = group.map((perm) => perm.id);
                                setSelectedIds((prev) => {
                                  let updated = [...prev];
                                  if (checked) {
                                    ids.forEach((id) => {
                                      if (!updated.includes(id))
                                        updated.push(id);
                                    });
                                  } else {
                                    updated = updated.filter(
                                      (id) => !ids.includes(id)
                                    );
                                  }
                                  return updated;
                                });
                              };

                              return (
                                <div
                                  key={resource}
                                  className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                                >
                                  <div className="flex items-center mb-3 gap-3">
                                    <label className="flex items-center cursor-pointer">
                                      <div className="relative">
                                        <input
                                          type="checkbox"
                                          className="sr-only peer"
                                          checked={allChecked}
                                          onChange={(e) =>
                                            handleGroupToggle(e.target.checked)
                                          }
                                        />
                                        <div className="w-5 h-5 border-2 rounded transition-colors bg-white peer-checked:bg-blue-500 peer-checked:border-blue-500 border-gray-300">
                                          {allChecked && (
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              className="h-4 w-4 text-white"
                                              viewBox="0 0 20 20"
                                              fill="currentColor"
                                            >
                                              <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                              />
                                            </svg>
                                          )}
                                          {!allChecked && someChecked && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                              <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center ml-3">
                                        <span className="text-sm font-semibold text-gray-700 capitalize">
                                          {resource} Permissions
                                        </span>
                                        <Badge
                                          count={`${
                                            group.filter((perm) =>
                                              selectedIds.includes(perm.id)
                                            ).length
                                          }/${group.length}`}
                                          style={{
                                            backgroundColor: someChecked
                                              ? "#1677ff"
                                              : "#d9d9d9",
                                            fontWeight: 500,
                                            marginLeft: "8px",
                                          }}
                                        />
                                      </div>
                                    </label>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {group.map((perm) => {
                                      const isChecked = selectedIds.includes(
                                        perm.id
                                      );
                                      const actionType =
                                        perm.name.split("-")[0];
                                      return (
                                        <div
                                          key={perm.id}
                                          className={`border rounded-lg p-3 transition-all ${
                                            isChecked
                                              ? "bg-blue-50 border-blue-200 shadow-sm"
                                              : "bg-white border-gray-200 hover:border-gray-300"
                                          } flex justify-between items-center`}
                                        >
                                          <div>
                                            <p className="text-sm font-medium text-gray-700">
                                              {formatPermissionName(perm.name)}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                              {getPermissionDescription(
                                                actionType
                                              )}
                                            </p>
                                          </div>
                                          <label className="cursor-pointer">
                                            <div className="relative">
                                              <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={isChecked}
                                                onChange={() =>
                                                  handleChange(perm.id)
                                                }
                                              />
                                              <div className="w-5 h-5 border-2 rounded transition-colors bg-white peer-checked:bg-blue-500 peer-checked:border-blue-500 border-gray-300">
                                                {isChecked && (
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-4 w-4 text-white"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                  >
                                                    <path
                                                      fillRule="evenodd"
                                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                      clipRule="evenodd"
                                                    />
                                                  </svg>
                                                )}
                                              </div>
                                            </div>
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          description="No permissions available"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Card>
  );
};

export default DetailRole;

// ✅ Group by type (e.g., "settings", "account", etc.)
function dataTransform(data) {
  if (!Array.isArray(data)) return {};

  const grouped = {};

  data.forEach((item) => {
    const readableType = convertToReadableText(item.type || "Other");
    if (!grouped[readableType])
      grouped[readableType] = { main: [], related: [] };

    // Check if permission is a main permission (if its name matches the 'type')
    const permissionNameParts = item.name.split("-");
    const action = permissionNameParts[0];
    const resource = permissionNameParts[1];

    // Check if the resource matches the type (e.g., "task" permission related to "task")
    if (resource === readableType.toLowerCase()) {
      grouped[readableType].main.push(item);
    } else {
      grouped[readableType].related.push(item);
    }
  });

  for (const key in grouped) {
    grouped[key].main.sort((a, b) => a.id - b.id);
    grouped[key].related.sort((a, b) => a.id - b.id);
  }

  return grouped;
}

function convertToReadableText(str) {
  if (!str) return "";
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

function formatPermissionName(name) {
  const [action, resource] = name.split("-");
  return `${capitalize(action)} ${capitalize(resource)}`;
}

function getPermissionDescription(action) {
  const descriptions = {
    create: "Allows adding new records",
    view: "Allows viewing existing records",
    readAll: "Allows viewing all records",
    readSingle: "Allows viewing specific records",
    update: "Allows modifying existing records",
    delete: "Allows removing existing records",
    assign: "Allows assigning records to others",
    manage: "Allows complete control",
  };
  return descriptions[action] || "Permission for this action";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
