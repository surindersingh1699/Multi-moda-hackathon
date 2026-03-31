import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);
const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const id = randomUUID();
  const input = join(tmpdir(), `heic-${id}.heic`);
  const output = join(tmpdir(), `heic-${id}.jpg`);

  try {
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    await writeFile(input, buf);
    await execFileAsync("sips", ["-s", "format", "jpeg", input, "--out", output]);
    const jpeg = await readFile(output);

    return new NextResponse(new Uint8Array(jpeg), {
      headers: { "Content-Type": "image/jpeg" },
    });
  } catch (e) {
    console.error("HEIC conversion error:", e);
    return NextResponse.json(
      { error: "Failed to convert image" },
      { status: 500 }
    );
  } finally {
    unlink(input).catch(() => {});
    unlink(output).catch(() => {});
  }
}
