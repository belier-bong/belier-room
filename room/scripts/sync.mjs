// 작업 규칙(CLAUDE.md)·데이터 사전·저장 쿼리를 DB(ops.room_files)에서 받아 이 분석실 폴더에 맞춘다.
// 공개 GitHub 에는 도구만 있고, 데이터 구조가 드러나는 문서는 읽기 전용 키가 있어야 받을 수 있다.
// 저장 쿼리는 내 폴더에 같은 이름이 있으면 덮지 않는다(내가 고친 것 보호). q.sh·xlsx.sh 가 하루 한 번 자동으로 부른다.
import fs from "node:fs";
import path from "node:path";
import { ROOT, query } from "./db.mjs";

const quiet = process.argv.includes("--quiet");
try {
  const { rows } = await query("select path, body from ops.room_files order by path");
  let n = 0;
  for (const { path: p, body } of rows) {
    if (p.includes("..") || path.isAbsolute(p)) continue;
    const file = path.join(ROOT, p);
    if (p.startsWith("sql/") && fs.existsSync(file)) continue;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== body) { fs.writeFileSync(file, body); n++; }
  }
  fs.writeFileSync(path.join(ROOT, "scripts/.synced"), new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }));
  if (!quiet) console.log(`문서 맞춤: ${rows.length}개 중 ${n}개 새로 받음`);
} catch (e) {
  if (!quiet) { console.error("문서 받기 실패:", e.message); process.exit(1); }
}
