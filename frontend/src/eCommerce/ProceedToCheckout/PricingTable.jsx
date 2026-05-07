import { Button, Card } from "antd";
import { useSelector } from "react-redux";
import useCurrency from "../../utils/useCurrency";

export default function PricingTable({ list, form, loader, deliveryFeeId }) {
  const currency = useCurrency();
  const { list: deliveryFee } = useSelector((state) => state.deliveryFee);

  const deliveryFeeCalculate = () => {
    if (deliveryFeeId && deliveryFee) {
      return deliveryFee.find((item) => item.id == deliveryFeeId)?.deliveryFee;
    }
    return null;
  };

  return (
    <Card className='bg-white'>
      <div>

        <div className='flex flex-col gap-1 mt-3'>
          <div className='flex justify-between items-center'>
            <h3 className='font-semibold'>Order summary</h3>
          </div>

          <div className='flex justify-between items-center'>
            <h3 className='font-semibold'>Items Total</h3>
            <span className=''>
              <span
                dangerouslySetInnerHTML={{
                  __html: currency?.currencySymbol,
                }}
              />{" "}
              {list?.totalAmount}
            </span>
          </div>

          {deliveryFeeCalculate() && (
            <div className='flex justify-between items-center'>
              <h3 className='font-semibold'>Delivery Fee</h3>
              <span className=''>
                <span
                  dangerouslySetInnerHTML={{
                    __html: currency?.currencySymbol,
                  }}
                />{" "}
                {deliveryFeeCalculate()}
              </span>
            </div>
          )}

          <div className='flex justify-between items-center'>
            <h3 className='font-semibold'>Total payment</h3>
            <span className=''>
              <span
                dangerouslySetInnerHTML={{
                  __html: currency?.currencySymbol,
                }}
              />{" "}
              {list?.totalAmount + (deliveryFeeCalculate() || 0)}
            </span>
          </div>

          <Button
            loading={loader}
            onClick={() => form.submit()}
            className='bg-ePrimary text-white  w-full rounded-md my-2'
          >
            Place order
          </Button>
        </div>
      </div>
    </Card>
  );
}
