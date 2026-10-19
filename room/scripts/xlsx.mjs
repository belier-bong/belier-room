// 시트별 엑셀 보고서: node scripts/xlsx.mjs reports/2026-10-19_주제.xlsx "요약=sql/a.sql" "목록=select …"
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { ROOT, query, sqlOf } from "./db.mjs";

const [out, ...specs] = process.argv.slice(2);
if (!out || !specs.length) { console.error('사용법: zsh scripts/xlsx.sh reports/<날짜>_<주제>.xlsx "시트명=sql/파일.sql" "시트명=select …"'); process.exit(1); }
const file = path.isAbsolute(out) ? out : path.join(ROOT, out);
const num = (v) => (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) && v.length < 16 ? Number(v) : v);

const wb = new ExcelJS.Workbook();
for (const spec of specs) {
  const i = spec.indexOf("=");
  const name = spec.slice(0, i).trim().slice(0, 31);
  const { fields, rows } = await query(sqlOf(spec.slice(i + 1)));
  const ws = wb.addWorksheet(name);
  ws.addRow(fields);
  for (const r of rows) ws.addRow(fields.map((f) => num(r[f])));
  ws.getRow(1).eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2328" } }; c.alignment = { vertical: "middle", wrapText: true }; });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  fields.forEach((f, k) => {
    const len = Math.max([...f].length * 2, ...rows.slice(0, 500).map((r) => [...String(r[f] ?? "")].length * 1.3));
    ws.getColumn(k + 1).width = Math.min(60, Math.max(8, Math.ceil(len)));
  });
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: fields.length } };
  console.log(`  ${name}: ${rows.length}행`);
}
fs.mkdirSync(path.dirname(file), { recursive: true });
await wb.xlsx.writeFile(file);
console.log("저장:", file);
