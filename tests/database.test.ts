import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("schema: atomic submission, duplicate prevention, editing, status, expiry and access control", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role;",
    );
    const schema = await readFile(
      new URL("../supabase/schema.sql", import.meta.url),
      "utf8",
    );
    await db.exec(schema.replace("between 1 and 6", "between 1 and 3"));
    const migration = await readFile(
      new URL(
        "../supabase/migrations/20260928_six_keywords.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    const s = await db.query<{ id: string }>(
      `insert into sessions(code,title,song_title,youtube_url,youtube_video_id,teacher_token_hash) values('A7K3PM','달빛 감상','달빛','https://youtu.be/dQw4w9WgXcQ','dQw4w9WgXcQ',repeat('a',64)) returning id`,
    );
    const id = s.rows[0].id,
      p = "cdfc86e2-5c70-4d6a-8a0a-70fc58d73398";
    const save = (words: string[], edit = false) =>
      db.query("select save_response($1,$2,$3,$4,$5)", [
        id,
        p,
        words,
        "조용한 밤",
        edit,
      ]);
    await assert.rejects(save(["밤"]), /ROOM_CLOSED/);
    await db.query("update sessions set status='collecting' where id=$1", [id]);
    await save(["밤", "고요함"]);
    await assert.rejects(save(["밤"]), /duplicate key/);
    await save(["달빛"], true);
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from responses",
        )
      ).rows[0].count,
      1,
    );
    assert.deepEqual(
      (await db.query<{ word: string }>("select word from response_words"))
        .rows,
      [{ word: "달빛" }],
    );
    await assert.rejects(save(["a", "A"], true), /INVALID_INPUT/);
    await save(["밤", "고요함", "피아노", "느림", "작아짐", "숲"], true);
    await assert.rejects(
      save(["a", "b", "c", "d", "e", "f", "g"], true),
      /INVALID_INPUT/,
    );
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from response_words",
        )
      ).rows[0].count,
      6,
    );
    await db.query("update sessions set status='closed' where id=$1", [id]);
    await assert.rejects(save(["밤"], true), /ROOM_CLOSED/);
    await db.query(
      "update sessions set status='collecting',expires_at=now()-interval '1 second' where id=$1",
      [id],
    );
    await assert.rejects(save(["밤"], true), /ROOM_EXPIRED/);
    await db.exec("set role anon;");
    await assert.rejects(
      db.query("select * from sessions"),
      /permission denied/,
    );
    await assert.rejects(save(["밤"]), /permission denied/);
    await db.exec("reset role;");
    await db.query("delete from sessions where id=$1", [id]);
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from response_words",
        )
      ).rows[0].count,
      0,
    );
  } finally {
    await db.close();
  }
});
