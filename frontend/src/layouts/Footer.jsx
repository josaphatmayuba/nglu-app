import { sanitizeHtml } from "../utils/sanitizeHtml";

function Footer({ data }) {
  const year = new Date().getFullYear();

  return (
    <div className="flex items-center justify-center py-3">
      {!data?.footer ? (
        <p>{year}</p>
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
