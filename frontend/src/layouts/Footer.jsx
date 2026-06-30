import { sanitizeHtml } from "../utils/sanitizeHtml";

function Footer({ data }) {
  const year = new Date().getFullYear();

  return (
    <div className="flex items-center justify-center py-3">
      {!data?.footer ? (
        <p>
          {year}{" "}
          <a
            href="https://solution.omega.ac"
            className="font-weight-bold"
            target="_blank"
            rel="noreferrer">
            Omega Solution
          </a>{" "}
          One stop solution.
        </p>
      ) : (
        <span
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(data.footer),
          }}></span>
      )}
    </div>
  );
}

export default Footer;
