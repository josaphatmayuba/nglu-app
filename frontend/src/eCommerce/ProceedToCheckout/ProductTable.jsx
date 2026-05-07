import { Card } from "antd";
import { useDispatch } from "react-redux";
import { cartToggler } from "../../redux/rtk/features/cart/cartSlice";
import CartCard from "../Card/CartCard";

export default function ProductTable({ list }) {
  const dispatch = useDispatch();
  return (
    <Card
      className='bg-white'
      title={`Products`}
      extra={
        <button
          onClick={() => dispatch(cartToggler(true))}
          className='px-3 py-1 rounded-lg text-blue-600 hover:text-blue-400'
        >
          Edit
        </button>
      }
      bodyStyle={{ padding: 0 }}
    >
      <div className='max-h-[250px] overflow-y-auto'>
        {list?.cartProducts?.map((cart, index) => (
          <CartCard data={cart} key={index} isQuantity cartId={list?.id} />
        ))}
      </div>
      <div></div>
    </Card>
  );
}
