import { errorHandler, successHandler } from "@/utils/functions";
import axios from "axios";

export const addReturnSale = async (values) => {
  try {
    const { data } = await axios({
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      url: `return-sale-invoice/`,
      data: {
        ...values,
      },
    });
    return successHandler(data);
  } catch (error) {
    return errorHandler(error, true);
  }
};
