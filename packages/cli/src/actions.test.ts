import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { initProject, openApiCommand, replayCommand, verifyCommand } from "./actions.js";

describe("CLI actions", () => {
  it("creates a valid starter project", async () => {
    const root = await mkdtemp(join(tmpdir(), "sapmock-cli-"));
    await initProject(root);
    expect(await verifyCommand(root)).toBe(0);
    expect(await replayCommand(root, "GET", "/qm/notifications/10000042", "bapi-error")).toBe(0);
    expect(await openApiCommand(root)).toBe(0);
  });
});
