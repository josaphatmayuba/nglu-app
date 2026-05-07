import clsx from "clsx";
import toast from "react-hot-toast";
import { twMerge } from "tailwind-merge";

// remove all falsy property from  object
export function removeFalsyProperties(obj) {
  const newObj = {};
  for (const prop in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, prop) && obj[prop]) {
      newObj[prop] = obj[prop];
    }
  }
  return newObj;
}

export function stringShorter(str, length) {
  return str?.length > length ? str.slice(0, length) + "..." : str;
}

export function errorHandler(error, toastStatus) {
  if (error.response?.data?.error) {
    toastStatus && toast.error(error.response.data.error);
    return {
      message: "error",
      error: error.response.data.error,
    };
  } else {
    toastStatus && toast.error("Something went wrong, Please try again");
    return {
      message: "error",
      error: "Something went wrong, Please try again",
    };
  }
}

export function successHandler(data, message, messageType = "success") {
  message && toast[messageType](message);
  return {
    message: "success",
    data,
  };
}

export function averageRatingPercentageCalculate(mainObject, rating) {
  // eslint-disable-next-line no-prototype-builtins
  if (mainObject.Rating.hasOwnProperty(rating)) {
    const totalReviews = mainObject.Rating[rating];
    const totalAllReviews = mainObject.totalReview;

    // Calculate the average
    const average = (totalReviews / totalAllReviews) * 100;

    return average;
  } else {
    return 0;
  }
}

export function priceCalculator(price, discountObject) {
  let newPrice = price;
  if (discountObject?.type === "flat") {
    newPrice = price - discountObject.value;
  } else if (discountObject?.type === "percentage") {
    const percentage = (discountObject.value / 100) * price;
    newPrice = price - percentage;
  }

  return Number(newPrice).toFixed(2);
}

export function formatDate(dateString) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

export function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const timeDifference = now - date;

  const seconds = Math.floor(timeDifference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  if (years > 2) {
    return formatDate(dateString);
  } else if (years > 0) {
    return `${years} year${years > 1 ? "s" : ""} ago`;
  } else if (months > 0) {
    return `${months} month${months > 1 ? "s" : ""} ago`;
  } else if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else if (seconds > 0) {
    return `${seconds} second${seconds > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

export function groupByAttribute(data) {
  const groupedData = {};

  data?.forEach((item) => {
    const attributeId = item.productAttributeValue.productAttribute.id;

    if (!groupedData[attributeId]) {
      groupedData[attributeId] = [];
    }

    groupedData[attributeId].push(item);
  });

  return Object.values(groupedData);
}

export const couponCalculate = (originalPrice, discountObject) => {
  if (
    typeof originalPrice !== "number" ||
    !discountObject ||
    typeof discountObject !== "object"
  ) {
    return {
      originalPrice,
      discountType: "invalid",
      discountAmount: 0,
      discountedPrice: originalPrice,
    };
  }

  const { type, value } = discountObject;

  if (type !== "flat" && type !== "percentage") {
    return {
      originalPrice,
      discountType: "invalid",
      discountAmount: 0,
      discountedPrice: originalPrice,
    };
  }

  if (type === "flat") {
    if (typeof value !== "number") {
      return {
        originalPrice,
        discountType: "invalid",
        discountAmount: 0,
        discountedPrice: originalPrice,
      };
    }

    const discountedPrice = originalPrice - value;

    return {
      originalPrice,
      discountType: "flat",
      discountAmount: value,
      discountedPrice,
    };
  } else if (type === "percentage") {
    if (typeof value !== "number" || value < 0 || value > 100) {
      return {
        originalPrice,
        discountType: "invalid",
        discountAmount: 0,
        discountedPrice: originalPrice,
      };
    }

    const discountAmount = (originalPrice * value) / 100;
    const discountedPrice = originalPrice - discountAmount;

    return {
      originalPrice,
      discountType: "percentage",
      discountPercentage: value,
      discountAmount,
      discountedPrice,
    };
  }
};

export function nameRender(userObj) {
  if (userObj && userObj.firstName && userObj.lastName) {
    return `${userObj.firstName} ${userObj.lastName}`;
  } else if (userObj && userObj.username) {
    return userObj.username;
  }

  return null;
}

export const compareArrays = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return false;
  } else if (a.length !== b.length) return false;
  else {
    const aa = [...a];
    const bb = [...b];

    aa.sort();
    bb.sort();
    for (let i = 0; i < aa.length; i++) {
      if (aa[i] !== bb[i]) {
        return false;
      }
    }
    return true;
  }
};

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function LocalCartToCart(localCart) {
  const LocalCart = JSON.parse(localCart);
  const newCart = LocalCart.map((item) => ({
    productAttributeValueId: item.productAttributeValueId,
    productId: item.productId,
    colorId: item.colorId || null,
    productQuantity: item.productQuantity,
  }));
  return newCart;
}

export function hasPermission(permissions, myPermissions, operator) {
  if (!myPermissions && Array.isArray(permissions)) return null;

  if (!Array.isArray(myPermissions)) {
    myPermissions = [myPermissions];
  }

  if (operator === "or") {
    return permissions.some((permission) => myPermissions.includes(permission));
  } else if (operator === "and") {
    return myPermissions.every((permission) =>
      permissions.includes(permission)
    );
  } else {
    return myPermissions.every((permission) =>
      permissions.includes(permission)
    );
  }
}

export function decodeHtmlEntity(htmlEntity) {
  const textArea = document.createElement("textarea");
  textArea.innerHTML = htmlEntity;
  return textArea.textContent;
}
