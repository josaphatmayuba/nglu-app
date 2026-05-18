import dayjs from "dayjs";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadConfigEmail } from "../../redux/rtk/features/emailConfig/emailConfigSlice";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import UpdateEmailConfig from "./UpdateEmailConfig";
import Card from "../../UI/Card";
import PageHeader from "../../UI/PageHeader";

export default function GetAllEmailConfig() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.emailConfig);
  useEffect(() => {
    dispatch(loadConfigEmail());
  }, [dispatch]);
  const columns = [
    {
      id: 1,
      title: "Name",
      dataIndex: "emailConfigName",
      key: "emailConfigName",
    },
    {
      id: 2,
      title: "Host",
      dataIndex: "emailHost",
      key: "emailHost",
    },
    {
      id: 3,
      title: "Port",
      dataIndex: "emailPort",
      key: "emailPort",
    },
    {
      id: 4,
      title: "Email User",
      dataIndex: "emailUser",
      key: "emailUser",
    },
    {
      id: 5,
      title: "Create date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => dayjs(createdAt).format("YYYY-MM-DD"),
      renderCsv: (createdAt) => dayjs(createdAt).format("YYYY-MM-DD"),
    },
  ];
  return (
    <>
      <PageHeader
        title="Configuration email"
        subtitle="Paramètres SMTP pour l'envoi des emails"
        actions={
          <CreateDrawer
            permission={"update-emailConfig"}
            title={"Update Email Config"}
            width={35}
          >
            <UpdateEmailConfig data={list} />
          </CreateDrawer>
        }
      />
    <Card
      className="max-md:border-0 max-md:bg-white"
      bodyClass="max-md:p-0 "
    >
      <UserPrivateComponent permission={"readAll-emailConfig"}>
        <TableComponent
          columns={columns}
          list={list}
          total={null}
          // setPageConfig={setPageConfig}
          loading={loading}
          title={"Email Config List"}
          isSearch={false}
        />
      </UserPrivateComponent>
    </Card>
    </>
  );
}
