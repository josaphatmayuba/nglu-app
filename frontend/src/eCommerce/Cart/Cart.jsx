import CartCard from "../Card/CartCard";

export default function Cart({ list }) {
  return (
    <div>
      {list?.cartProducts?.map((item) => {
        return (
          <CartCard key={item.id} isQuantity data={item} cartId={list?.id} />
        );
      })}
    </div>
  );
}
