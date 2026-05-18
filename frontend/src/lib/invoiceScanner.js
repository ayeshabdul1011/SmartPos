import Tesseract from "tesseract.js";

export const scanInvoice = async (file) => {
  const result = await Tesseract.recognize(
    file,
    "eng"
  );

  return result.data.text;
};