export default function getQuery() {
  const queryString = window.location.search;
  return new URLSearchParams(queryString);
}
