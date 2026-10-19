// 공통: .env 의 DATABASE_URL(팀원용 읽기 전용 키)로 연결하고, 모든 조회를 읽기 전용 트랜잭션·서울 시간·120초 제한 안에서 실행한다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 날짜·시간·큰 숫자는 문자 그대로 받는다(시간대 밀림·소수 오차 방지)
for (const oid of [1082, 1114, 1184, 1700, 20]) pg.types.setTypeParser(oid, (v) => v);

function dbUrl() {
  const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
  const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
  if (!url) throw new Error(".env 에 DATABASE_URL 이 없습니다 — 설치 파일을 다시 실행해 주세요.");
  return url;
}

/** sql 문자열 하나를 읽기 전용으로 실행 → { fields, rows } */
export async function query(sql) {
  const client = new pg.Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout = '120s'");
    await client.query("set local timezone = 'Asia/Seoul'");
    const r = await client.query(sql);
    await client.query("commit");
    const last = Array.isArray(r) ? r[r.length - 1] : r;
    return { fields: (last.fields || []).map((f) => f.name), rows: last.rows || [] };
  } finally {
    await client.end().catch(() => {});
  }
}

/** "sql/파일.sql" 이면 파일 내용, 아니면 그대로(상대 경로는 분석실 폴더 기준) */
export function sqlOf(arg) {
  const p = path.isAbsolute(arg) ? arg : path.join(ROOT, arg);
  return arg.trim().toLowerCase().endsWith(".sql") && fs.existsSync(p) ? fs.readFileSync(p, "utf8") : arg;
}
