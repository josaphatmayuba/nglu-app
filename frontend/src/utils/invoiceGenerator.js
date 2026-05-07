import jsPDF from "jspdf";
import "jspdf-autotable";

function stripHtml(html) {
  var doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

export default function invoiceGenerator(
  type,
  {
    title,
    TopRightInfo,
    customerInfo,
    companyInfo,
    tableHead,
    tableBody,
    bottomLeftContent,
    bottomRightContent,
    settings,
    leftBottomSecondColumnX = 48,
  }
) {
  const doc = new jsPDF(settings.jsPDF);

  //====== By default font Size ===========
  //   tableFontSize: 10,
  //   infoTopFontSize: 8,
  //   bottomRightFontSize:12,
  //   bottomLeftFontSize: 8,
  //   footerFontSize:10
  //=======================================

  // Set the document font and size
  // doc.setFont("Titillium Web");
  doc.setFontSize(settings.fontSize);
  const pageSize = doc.internal.pageSize;
  const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
  const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();

  //==================== Define the header content============================
  const headerContent = function () {
    const img = new Image();
    img.src = companyInfo?.logo;
    if (
      ["png", "PNG", "JPG", "jpg", "JPEG", "jpeg", "webp"].some((item) =>
        companyInfo?.logo?.includes(item)
      )
    ) {
      doc.addImage(img, "PNG", 15, 10, 50, 15);
    }
    // Add company name (right-aligned)
    doc.setFontSize(20);
    doc.text(companyInfo.companyName, pageWidth - 15, 10, {
      align: "right",
    });

    // Other company information (right-aligned)
    doc.setFontSize(11);
    doc.setTextColor(128, 128, 128);
    doc.text(companyInfo?.tagLine, pageWidth - 15, 15, {
      align: "right",
    });
    doc.text(companyInfo.address, pageWidth - 15, 20, {
      align: "right",
    });
    doc.text(companyInfo.phone, pageWidth - 15, 25, {
      align: "right",
    });
    doc.text(`Email: ${companyInfo.email}`, pageWidth - 15, 30, {
      align: "right",
    });
    doc.textWithLink(companyInfo.website, pageWidth - 15, 35, {
      url: companyInfo.website,
      align: "right",
    });
    //========================== Invoice title ===========================
    if (title) {
      const TITLE = title.toUpperCase();
      // Set the document font and size to bold
      // doc.setFont("Titillium Web", "bold");
      doc.setFontSize(14);
      doc.setTextColor(0);
      const textWidth =
        (doc.getStringUnitWidth(TITLE) * 14) / doc.internal.scaleFactor;
      const xPos = (pageWidth - textWidth) / 2;
      const textHeight = doc.internal.getLineHeight();
      const yPos = 45;
      doc.text(TITLE, xPos, yPos);

      const padding = 2;
      const borderRadius = 4;
      const borderYPos = yPos - 14 * 0.3;
      // doc
      //   .roundedRect(
      //     xPos - padding,
      //     borderYPos - padding,
      //     textWidth + 2 * padding,
      //     textHeight - 6,
      //     borderRadius,
      //     borderRadius
      //   )
      //   .stroke();

      // Set the document font and size to bold
      // doc.setFont("Titillium Web", "normal");
      doc.setFontSize(10);
    }
  };

  //======================= Define the footer content=============================
  const footerContent = function (data) {
    doc.setFontSize(settings.footerFontSize ? settings.footerFontSize : 10);
    // doc.setFont("Titillium Web", "normal");
    const pageSize = doc.internal.pageSize;
    const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
    const xCoordinate = pageWidth / 2;
    doc.text(stripHtml(companyInfo?.footer), xCoordinate, pageHeight - 10, {
      align: "center",
    });
  };
  //==================if no invoice title add horizontal line=======================
  if (!title) {
    // Draw border
    doc.setDrawColor(0);
    doc.setLineWidth(0.1);
    doc.line(10, 40, pageWidth - 10, 40); // Top border
  }

  //================ top left side info section =====================================
  let customerInfoStartY = title ? 55 : 50;
  const customerBoxWidth = pageWidth / 2 - 50;
  const spacingBetweenItems = 1;
  customerInfo
    ?.filter((info) => info.value)
    ?.forEach((info) => {
      doc.setFontSize(settings.infoTopFontSize ? settings.infoTopFontSize : 8);
      // doc.setFont("Titillium Web", "normal");

      if (info.style?.bold) {
        // doc.setFont("Titillium Web", "bold");
      }
      if (info.style?.fontSize) {
        doc.setFontSize(info.style?.fontSize);
      }
      const contentLines = doc.splitTextToSize(
        `${info.value}`,
        customerBoxWidth
      );
      const contentLinesHeight = doc.getTextDimensions(contentLines).h;
      doc.text(contentLines, 14, customerInfoStartY);
      // doc.setFont("Titillium Web", "normal");
      doc.setFontSize(8);
      customerInfoStartY += contentLinesHeight + spacingBetweenItems;
    });

  //========================top right invoice info right ============================

  let InvoiceStartY = title ? 55 : 50;
  const InvoiceBoxWidth = pageWidth / 2 - 50;
  const spacingBetweenInvoiceItems = 1;
  TopRightInfo?.filter((info) => info.value)?.forEach((info, index) => {
    doc.setFontSize(settings.infoTopFontSize ? settings.infoTopFontSize : 8);
    // doc.setFont("Titillium Web", "normal");
    if (info.style?.bold) {
      // doc.setFont("Titillium Web", "bold");
    }
    if (info.style?.fontSize) {
      doc.setFontSize(info.style?.fontSize);
    }

    const contentLines = doc.splitTextToSize(`${info.value}`, InvoiceBoxWidth);
    const contentLinesHeight = doc.getTextDimensions(contentLines).h;
    doc.text(contentLines, pageWidth - 15, InvoiceStartY, { align: "right" });
    // doc.setFont("Titillium Web", "normal");
    doc.setFontSize(8);
    InvoiceStartY += contentLinesHeight + spacingBetweenInvoiceItems;
  });

  //====================== Main table items ===============================
  doc.autoTable({
    startY: Math.max(customerInfoStartY, InvoiceStartY),
    head: [tableHead],
    body: tableBody,
    margin: {
      top: title ? 55 : 50,
      bottom: settings.bottomMargin ? settings.bottomMargin : 40,
    },
    willDrawPage: headerContent,
    didDrawPage: footerContent,
    styles: {
      fontSize: settings.tableFontSize ? settings.tableFontSize : 10, // Set your desired font size here
      // font: "TitilliumWeb",
    },
    didParseCell: function (data) {
      // data.cell.styles.font = "TitilliumWeb";
    },
  });

  // ====================== bottom left info ===============================
  doc.setFontSize(
    settings.bottomLeftFontSize ? settings.bottomLeftFontSize : 8
  );
  // Calculate Y-coordinate for additional content
  let startYForAdditionalContent = doc.autoTable.previous.finalY + 10;
  doc.setDrawColor(0);
  doc.setLineWidth(0.1);
  doc.line(
    14,
    doc.autoTable.previous.finalY,
    pageWidth - 14,
    doc.autoTable.previous.finalY
  );

  // left side box width
  const boxWidth = pageWidth / 2 - 30;

  // calculate leftContent abd rightContent height or y coordinate before additional content added
  const leftYBeforeWrite = bottomLeftContent
    .filter((item) => item.value)
    .reduce((total, item) => {
      const contentLines = doc.splitTextToSize(item.value, boxWidth);
      // get contentLines height or y coordinate
      const contentLinesHeight = doc.getTextDimensions(contentLines).h;
      const spacingBetweenItems = 2;
      return total + contentLinesHeight + spacingBetweenItems;
    }, startYForAdditionalContent);

  const rightYBeforeWrite =
    (bottomRightContent.filter((item) => item.value).length - 1) * 6 +
    startYForAdditionalContent;

  const bigHeight = Math.max(leftYBeforeWrite, rightYBeforeWrite);
  if (bigHeight > pageHeight - 12) {
    doc.addPage();
    headerContent();
    // Draw border
    doc.setDrawColor(0);
    doc.setLineWidth(0.1);
    doc.line(14, 40, 200, 40); // Top border
    footerContent();
    startYForAdditionalContent = Math.max(customerInfoStartY, InvoiceStartY);
  }

  const leftColumnX = 14;
  const leftColumn2X = leftBottomSecondColumnX;
  let leftColumnY = startYForAdditionalContent;
  const rightColumnX = pageWidth / 2 + 30;
  const rightColumn2X = pageWidth - 15;
  const rightColumnY = startYForAdditionalContent;

  bottomLeftContent
    .filter((item) => item.value)
    .forEach((item) => {
      const contentLines = doc.splitTextToSize(item.value, boxWidth);
      // get contentLines height or y coordinate
      const contentLinesHeight = doc.getTextDimensions(contentLines).h;
      doc.text(item.label, leftColumnX, leftColumnY);
      doc.text(contentLines, leftColumn2X, leftColumnY);
      const spacingBetweenItems = 2;
      leftColumnY += contentLinesHeight + spacingBetweenItems;
    });

  //====================bottom right info===============================
  // doc.setFont("Titillium Web", "normal");
  doc.setFontSize(
    settings.bottomRightFontSize ? settings.bottomRightFontSize : 12
  );
  doc.setTextColor(50, 50, 50);
  bottomRightContent
    .filter((item) => Boolean(item.value))
    .forEach((item, index) => {
      doc.text(item.label, rightColumnX, rightColumnY + index * 6);
      doc.text(item.value, rightColumn2X, rightColumnY + index * 6, {
        align: "right",
      });
    });

  // ======================= final print or download======================
  if (type === "download") {
    // Download the PDF
    doc.save(`${title}`);
  } else if (type === "print") {
    // Print the PDF
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank").print();
  } else {
    return doc.output("blob");
  }
}
