export default function queryGenerator(arg) {
  const queryProperty = Object.keys(arg);
  const propertyFiltered = queryProperty.filter((item) => {
    if (Array.isArray(arg[item])) {
      return !!arg[item]?.length;
    } else {
      return arg[item];
    }
  });

  let query = propertyFiltered
    .map((item) => {
      return `${item}=${[arg[item]]}`;
    })
    .join("&");
  if (query.includes("report")) {
    return query;
  }
  if (!query.includes("status")) {
    query = "status=true&" + query;
  }
  if (!query.includes("page")) {
    query = "page=1&" + query;
  }
  if (!query.includes("count")) {
    query = "count=10&" + query;
  }
  if (query.includes("key")) {
    query = "query=search&" + query;
  }
 

  return query;
}
