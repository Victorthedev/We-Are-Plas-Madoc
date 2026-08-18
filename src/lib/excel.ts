import * as XLSX from "xlsx";

export interface ExcelSheet {
  name: string;
  headers: string[];
  rows: (string | number)[][];
}

/** Multi-sheet .xlsx download, one tab per sheet. Sheet names are truncated to Excel's 31-char limit. */
export function downloadExcelWorkbook(filename: string, sheets: ExcelSheet[]) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const ws = XLSX.utils.aoa_to_sheet([s.headers, ...s.rows]);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}
