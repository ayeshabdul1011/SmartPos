import { jsPDF } from "jspdf";
import { fmt } from "./currency";

const STORE_NAME = "POS PRO";
const STORE_TAGLINE = "Thanks for shopping with us";

/**
 * Render a receipt as plain text lines suitable for ESC/POS or
 * for jsPDF on an 80mm receipt page.
 */
function buildLines(sale) {
  const width = 32; // characters per line for an 80mm 12cpi printer
  const pad = (l, r) => {
    const space = Math.max(1, width - l.length - r.length);
    return l + " ".repeat(space) + r;
  };
  const center = (s) =>
    " ".repeat(Math.max(0, Math.floor((width - s.length) / 2))) + s;

  const lines = [];
  lines.push(center(STORE_NAME));
  lines.push(center(STORE_TAGLINE));
  lines.push("-".repeat(width));
  lines.push(`Receipt #${sale.id.slice(0, 8)}`);
  lines.push(new Date(sale.created_at).toLocaleString("en-AU"));
  lines.push(`Cashier: ${sale.cashier_name}`);
  lines.push("-".repeat(width));
  for (const it of sale.items) {
    lines.push(it.name.slice(0, width));
    lines.push(
      pad(`  ${it.quantity} x ${fmt(it.price)}`, fmt(it.line_total))
    );
  }
  lines.push("-".repeat(width));
  lines.push(pad("Subtotal", fmt(sale.subtotal)));
  if (sale.discount) lines.push(pad("Discount", `-${fmt(sale.discount)}`));
  lines.push(pad("TOTAL", fmt(sale.total)));
  lines.push(pad("Paid", sale.payment_method.toUpperCase()));
  lines.push("");
  lines.push(center("Have a great day!"));
  return lines;
}

/**
 * Download an 80mm-wide PDF receipt that any thermal printer
 * (USB / network) can print via the browser/OS print pipeline.
 */
export function downloadReceiptPDF(sale) {
  const mmWidth = 80;
  const lineHeight = 4; // mm
  const padding = 4;
  const lines = buildLines(sale);
  const mmHeight = padding * 2 + lines.length * lineHeight + 10;

  const doc = new jsPDF({
    unit: "mm",
    format: [mmWidth, mmHeight],
    orientation: "portrait",
  });
  doc.setFont("courier", "normal");
  doc.setFontSize(9);

  let y = padding + 4;
  for (const line of lines) {
    doc.text(line, padding, y);
    y += lineHeight;
  }
  doc.save(`receipt-${sale.id.slice(0, 8)}.pdf`);
}

/**
 * Open a fresh window with a print-friendly 80mm receipt and
 * trigger the browser print dialog. Choose any installed
 * thermal printer (USB / Bluetooth / network) from there.
 */
export function printReceipt(sale) {
  const lines = buildLines(sale);
  const html = `<!doctype html>
<html><head>
<title>Receipt ${sale.id.slice(0, 8)}</title>
<meta charset="utf-8" />
<style>
  @page { size: 80mm auto; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 11px;
    line-height: 1.35;
    width: 80mm;
    padding: 4mm 4mm 8mm;
    white-space: pre;
  }
  .receipt { white-space: pre; }
  @media screen {
    body { background: #f4f4f5; }
    .receipt { background: white; padding: 6mm; margin: 16px auto; box-shadow: 0 0 0 1px #ddd; }
  }
</style>
</head>
<body>
<div class="receipt">${lines
    .map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;"))
    .join("\n")}</div>
<script>
  window.onload = function () {
    setTimeout(function () { window.print(); }, 250);
    window.onafterprint = function () { window.close(); };
  };
</script>
</body></html>`;

  const w = window.open("", "_blank", "width=420,height=720");
  if (!w) {
    alert("Pop-up blocked. Allow pop-ups for this site to print receipts.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
