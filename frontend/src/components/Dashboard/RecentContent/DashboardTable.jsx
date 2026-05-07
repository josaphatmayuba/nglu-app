import { Link } from "react-router-dom";
import Table from "../../../UI/Table";

export default function DashboardTable({
  loading,
  list,
  columns,
  title,
  slug,
  total,
}) {
  return (
    <>
      <div className='recent h-[332px] bg-white drop-shadow rounded-lg'>
        <div className='flex items-center justify-between p-3'>
          <h3 className='font-semibold font-Popins'>{title}</h3>
          <Link className='dark:text-white text-primary' to={`/admin/${slug}`}>
            View all {total ? `(${total})` : null}
          </Link>
        </div>
        <Table
          headClass={"bg-white"}
          columns={columns}
          data={list}
          width={807}
          loading={loading}
        />
      </div>
    </>
  );
}
