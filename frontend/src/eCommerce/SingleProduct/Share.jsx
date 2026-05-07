import { FaFacebookSquare } from "react-icons/fa";
import { FaRegCopy } from "react-icons/fa6";
import toast from "react-hot-toast";

export default function Share() {
  const handleCopyClick = () => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = window.location.href;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      // Set copySuccess to true to show a success message
      toast.success("Product URL Copy");
      textarea.remove();
    } catch (err) {}
  };

  const handleClickFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`;
    window.open(facebookUrl, "_blank");
  };

  const handleClickTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?url=${window.location.href}`;
    window.open(twitterUrl, "_blank");
  };
  return (
    <div className="flex items-center gap-4 p-3">
      <span className="cursor-pointer" onClick={handleCopyClick}>
        <FaRegCopy size={30} />
      </span>
      <span className="cursor-pointer" onClick={handleClickFacebook}>
        <FaFacebookSquare size={30} />
      </span>
      {/* <span className="cursor-pointer" onClick={() => handleClickTwitter()}>
        <FaSquareXTwitter />
      </span> */}
    </div>
  );
}
