import { useBarcode } from "next-barcode";
import React from "react";

function BarCodeGenerator({ sku, printPaper }) {
  const { inputRef } = useBarcode({
    value: `${sku}`,

    options: {
      background: "#FFFFFF",
      height: printPaper.height ? printPaper.height : 60,
      fontSize: printPaper.fontSize ? printPaper.fontSize : 15,
      width: printPaper.width ? printPaper.width : 1.5,
    },
    format: "EAN-13",
  });
  return <svg ref={inputRef} />;
}

export default BarCodeGenerator;
