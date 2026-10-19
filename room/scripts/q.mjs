// 읽기 전용 조회: node scripts/q.mjs [--csv] "select …" | -f sql/파일.sql
import { query, sqlOf } from "./db.mjs";

const args = process.argv.slice(2);
let csv = false;
if (args[0] === "--csv") { csv = true; args.shift(); }
const sql = args[0] === "-f" ? sqlOf(args[1]) : args[0];
if (!sql) { console.error('사용법: zsh scripts/q.sh "select …"  /  zsh scripts/q.sh --csv -f sql/파일.sql'); process.exit(1); }

// 한글·전각 글자는 화면에서 2칸 — 표 줄을 맞추려고 폭을 따로 센다
const wide = (s) => [...s].reduce((a, c) => a + (/[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/.test(c) ? 2 : 1), 0);
const cell = (v) => (v === null || v === undefined ? "∅" : typeof v === "object" ? JSON.stringify(v) : String(v));
try {
  const { fields, rows } = await query(sql);
  if (csv) {
    const esc = (v) => { const s = v === null || v === undefined ? "" : cell(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    console.log([fields.join(","), ...rows.map((r) => fields.map((f) => esc(r[f])).join(","))].join("\n"));
  } else {
    const w = fields.map((f) => Math.max(wide(f), ...rows.map((r) => wide(cell(r[f])))));
    const pad = (s, n) => s + " ".repeat(Math.max(0, n - wide(s)));
    console.log(fields.map((f, i) => pad(f, w[i])).join(" | "));
    console.log(w.map((n) => "-".repeat(n)).join("-+-"));
    for (const r of rows) console.log(fields.map((f, i) => pad(cell(r[f]), w[i])).join(" | "));
    console.log(`(${rows.length} rows)`);
  }
} catch (e) {
  console.error("ERROR:", e.message);
  process.exit(1);
}
