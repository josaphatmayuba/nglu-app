import { DeleteOutlined, SolutionOutlined } from "@ant-design/icons";
import { Button, Card, Popover, Typography, message } from "antd";
import { Fragment, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Loader from "../loader/loader";

import moment from "moment";
import {
  clearTransaction,
  loadTransaction,
  deleteTransaction,
} from "../../redux/rtk/features/transaction/transactionSlice.js";
import { loadDashboardStartup } from "../../redux/rtk/features/dashboard/dashboardSlice.js";

//PopUp

const DetailTransaction = () => {
  const { id } = useParams();
  let navigate = useNavigate();

  //dispatch
  const dispatch = useDispatch();
  const payment = useSelector((state) => state.transactions.transaction);

  const [visible, setVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleVisibleChange = (newVisible) => {
    setVisible(newVisible);
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      const result = await dispatch(deleteTransaction({ id, status: "false" }));

      if (result.payload?.success) {
        message.success("Transaction deleted successfully");
        setVisible(false);

        // Refresh dashboard data after deletion
        const today = moment();
        const last12mStart = today.subtract(1, "year").add(1, "day");
        dispatch(loadDashboardStartup({
          startDate: last12mStart.format("YYYY-MM-DD"),
          endDate: today.format("YYYY-MM-DD"),
        }));

        // Navigate back to transaction list after a short delay
        setTimeout(() => {
          navigate("/admin/transaction");
        }, 500);
      }
    } catch (error) {
      message.error("Failed to delete transaction");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    dispatch(loadTransaction(id));
    return () => {
      dispatch(clearTransaction());
    };
  }, [id, dispatch]);

  return (
    <div>
      <div className='my-[40px]'>
        {payment ? (
          <Fragment key={payment.id}>
            <Card bordered={false} className='card-custom'>
              <div
                className='card-header d-flex justify-content-between mb-2'
                style={{ padding: 0 }}
              >
                <h5>
                  <SolutionOutlined />
                  <span className='ml-[20px]'>
                    ID : {payment.id} | {payment.date}
                  </span>
                </h5>
                <Popover
                  content={
                    <div className='space-y-2'>
                      <p className='text-sm mb-3'>
                        Are you sure you want to delete this transaction?
                      </p>
                      <div className='flex gap-2'>
                        <Button
                          type='default'
                          size='small'
                          onClick={() => setVisible(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type='primary'
                          danger
                          size='small'
                          loading={deleting}
                          onClick={onDelete}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  }
                  title='Delete Transaction'
                  trigger='click'
                  visible={visible}
                  onVisibleChange={handleVisibleChange}
                >
                  <Button
                    type='text'
                    danger
                    icon={<DeleteOutlined />}
                    size='small'
                  >
                    Delete
                  </Button>
                </Popover>
              </div>
              <div>
                <p>
                  <Typography.Text className='font-semibold'>
                    Date :
                  </Typography.Text>{" "}
                  {moment(payment.date).format("YYYY-MM-DD")}
                </p>

                <p>
                  <Typography.Text strong>Amount :</Typography.Text>{" "}
                  {payment.amount}
                </p>

                <p>
                  <Typography.Text strong>Particulars :</Typography.Text>{" "}
                  {payment.particulars}
                </p>
                <p>
                  <Typography.Text strong>Type :</Typography.Text>{" "}
                  {payment.type}
                </p>
              </div>
            </Card>
          </Fragment>
        ) : (
          <Loader />
        )}
      </div>
    </div>
  );
};

export default DetailTransaction;
