import { useSelector } from "react-redux";

export default function useCurrency() {
  const { data } = useSelector((state) => state.setting);
 
  return data?.currency;
}
