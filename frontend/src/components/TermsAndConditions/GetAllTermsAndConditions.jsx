import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../UI/Card";
import PageHeader from "../../UI/PageHeader";
import { loadAllTermsAndConditions } from "../../redux/rtk/features/termsAndCondition/termsAndConditionSlice";
import { stringShorter } from "../../utils/functions";
import ViewBtn from "../Buttons/ViewBtn";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddTermsAndConditions from "./AddTermsAndConditions";

export default function GetAllTermsAndConditions() {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector(
    (state) => state.termsAndConditions
  );
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
  });

  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
      render: (id) => <Link to={`/admin/terms-and-condition/${id}`}>{id}</Link>,
      renderCsv: (id) => id,
    },

    {
      id: 2,
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (title, { id }) => (
        <Link to={`/admin/terms-and-condition/${id}`}>{title}</Link>
      ),
      renderCsv: (title) => title,
    },
    {
      id: 3,
      title: "Terms And Conditions",
      dataIndex: "subject",
      key: "subject",
      render: (subject) => stringShorter(subject, 40),
      renderCsv: (subject) => subject,
    },
    {
      id: 4,
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => moment(createdAt).format("YYYY-MM-DD"),
      renderCsv: (createdAt) => moment(createdAt).format("YYYY-MM-DD"),
    },
    {
      id: 5,
      title: "Action",
      key: "Action",
      render: ({ id }) => <ViewBtn path={`/admin/terms-and-condition/${id}`} />,
      csvOff: true,
    },
  ];
  useEffect(() => {
    dispatch(loadAllTermsAndConditions());
  }, [dispatch]);
  return (
    <>
      <PageHeader
        title="Conditions générales"
        subtitle="Mentions légales pour devis et factures"
        actions={
          <CreateDrawer
            permission={"create-termsAndCondition"}
            title={"Create Terms"}
            width={35}
          >
            <AddTermsAndConditions />
          </CreateDrawer>
        }
      />
      <Card
        className='max-md:border-0 max-md:bg-white'
        bodyClass='max-md:p-0 '
      >
        <UserPrivateComponent permission={"readAll-termsAndCondition"}>
          <TableComponent
            total={total}
            columns={columns}
            list={list}
            loading={loading}
            setPageConfig={setPageConfig}
            title={"Terms And Condition"}
          />
        </UserPrivateComponent>
      </Card>
    </>
  );
}
