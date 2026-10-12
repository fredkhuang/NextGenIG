// Reads the legacy Google Sheet export (.xlsx): rows keyed by column letter, plus cell comments.
// exceljs drops the text of these comments, so they are parsed straight from the package XML.

import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import type { CellComment, CellValue, RawRow } from "./transform";

const decode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

const textOf = (xml: string) =>
  decode([...xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((m) => m[1]).join("")).trim();

/** Comments for one worksheet (1-based sheet index), keyed by cell ref like "B15". */
async function readComments(zip: JSZip, sheetIndex: number): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  const rels = await zip.file(`xl/worksheets/_rels/sheet${sheetIndex}.xml.rels`)?.async("string");
  if (!rels) return out;
  const add = (ref: string, text: string) => {
    if (!text || text.startsWith("[Threaded comment]")) return;
    out.set(ref, [...(out.get(ref) ?? []), text]);
  };
  for (const [, target] of rels.matchAll(/Type="[^"]*\/(?:comments|threadedComment)"[^>]*Target="\.\.\/([^"]+)"/g)) {
    const xml = await zip.file(`xl/${target}`)?.async("string");
    if (!xml) continue;
    for (const [, ref, body] of xml.matchAll(/<(?:\w+:)?(?:threadedComment|comment)\s[^>]*?ref="([A-Z]+\d+)"[^>]*>([\s\S]*?)<\/(?:\w+:)?(?:threadedComment|comment)>/g)) {
      add(ref, textOf(body));
    }
  }
  return out;
}

export type SheetRow = { rowNumber: number; cells: RawRow; comments: CellComment[] };

export async function readLegacyWorkbook(path: string) {
  const buf = await readFile(path);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const zip = await JSZip.loadAsync(buf);

  const sitesSheet = wb.getWorksheet("Sites");
  if (!sitesSheet) throw new Error('No "Sites" worksheet');
  const sheetIndex = wb.worksheets.indexOf(sitesSheet) + 1;
  const comments = await readComments(zip, sheetIndex);

  const rows: SheetRow[] = [];
  sitesSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header (cell A1 holds a stray note, so columns are read by letter)
    const cells: RawRow = {};
    row.eachCell((cell) => {
      cells[cell.address.replace(/\d+$/, "")] = cell.value as CellValue;
    });
    const rowComments: CellComment[] = [];
    for (const [ref, texts] of comments) {
      if (Number(ref.replace(/^[A-Z]+/, "")) === rowNumber) texts.forEach((text) => rowComments.push({ ref, text }));
    }
    rows.push({ rowNumber, cells, comments: rowComments });
  });

  const taxonomy: { industry: string; sub_industry: string }[] = [];
  wb.getWorksheet("Choices")?.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const industry = String(row.getCell("A").value ?? "").trim();
    const sub = String(row.getCell("B").value ?? "").trim();
    if (industry && sub) taxonomy.push({ industry, sub_industry: sub });
  });

  return { rows, taxonomy };
}
