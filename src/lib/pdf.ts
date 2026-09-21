import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ReactDOMServer from "react-dom/server";
import WAPMLogo from "@/components/layout/WAPMLogo";
import type { PersonReportEntry } from "@/lib/vms";

async function getLogoDataUrl(): Promise<string> {
  const svgMarkup = ReactDOMServer.renderToStaticMarkup(WAPMLogo({ size: 200 }));
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svgBlob);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, 200, 200);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Failed to rasterize logo"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Draws the WAPM logo/letterhead and a title/subtitle, shared by every generated PDF. Returns the Y position content can start at. */
async function drawHeader(doc: jsPDF, title: string, subtitle: string): Promise<number> {
  try {
    const logoDataUrl = await getLogoDataUrl();
    doc.addImage(logoDataUrl, "PNG", 14, 12, 16, 16);
  } catch {
    // Best-effort: the document is still useful without the logo.
  }

  doc.setFontSize(16);
  doc.setTextColor(45, 27, 78); // brand deep purple
  doc.text("We Are Plas Madoc", 36, 20);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("CIO Charity No. 1197278", 36, 25);
  doc.text("The Opportunities Centre, Plas Madoc, Wrexham, LL14 3US", 36, 29);

  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(title, 14, 42);
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(subtitle, 14, 48);

  return 54;
}

function drawFooter(doc: jsPDF) {
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, 14, doc.internal.pageSize.getHeight() - 10);
}

const safeFilename = (s: string) => s.replace(/[^a-z0-9]+/gi, "_");

export async function generatePersonReportPdf(
  personName: string,
  dateRangeLabel: string,
  entries: PersonReportEntry[]
) {
  const doc = new jsPDF();
  const startY = await drawHeader(doc, `Attendance Report: ${personName}`, dateRangeLabel);

  autoTable(doc, {
    startY,
    head: [["Date", "Type", "Incident"]],
    body: entries.length > 0
      ? entries.map((e) => [
          new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          e.label,
          e.incident ? `${e.incident.incidentType === "accident" ? "Accident" : "Medical Emergency"}: ${e.incident.description}` : "None recorded",
        ])
      : [["-", "-", "No attendance recorded in this range"]],
    headStyles: { fillColor: [123, 45, 142] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 2: { cellWidth: 90 } },
  });

  drawFooter(doc);
  doc.save(`WAPM_Attendance_Report_${safeFilename(personName)}.pdf`);
}

export interface PdfReportSection {
  heading: string;
  columns: string[];
  rows: (string | number)[][];
}

/** A single- or multi-section tabular PDF (Incidents/Visitors/Attendance exports, or the combined Reports "Full Report"). */
export async function generateListReportPdf(
  filenamePrefix: string,
  title: string,
  dateRangeLabel: string,
  sections: PdfReportSection[]
) {
  const doc = new jsPDF();
  let y = await drawHeader(doc, title, dateRangeLabel);
  const pageHeight = doc.internal.pageSize.getHeight();

  sections.forEach((section, i) => {
    if (i > 0 && y > pageHeight - 40) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(section.heading, 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [section.columns],
      body: section.rows.length > 0 ? section.rows : [section.columns.map(() => "-")],
      headStyles: { fillColor: [123, 45, 142] },
      styles: { fontSize: 8, cellPadding: 2.5 },
      margin: { top: 20 },
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  });

  drawFooter(doc);
  doc.save(`WAPM_${filenamePrefix}.pdf`);
}

/** A wide roster dump (all fields for every record), landscape since these tables run wide. */
export async function generateRosterPdf(
  filenamePrefix: string,
  title: string,
  subtitle: string,
  columns: string[],
  rows: (string | number)[][]
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = await drawHeader(doc, title, subtitle);

  autoTable(doc, {
    startY,
    head: [columns],
    body: rows.length > 0 ? rows : [columns.map(() => "-")],
    headStyles: { fillColor: [123, 45, 142] },
    styles: { fontSize: 7, cellPadding: 2 },
  });

  drawFooter(doc);
  doc.save(`WAPM_${filenamePrefix}.pdf`);
}
