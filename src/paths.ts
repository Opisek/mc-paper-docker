import { mkdirSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

export const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const minecraft = join(rootDir, "minecraft");
export const data = join(rootDir, "data");
export const versionFile = join(data, ".version");
export const buildFile = join(data, ".build");
export const binariesFile = join(data, ".binaries");

export const createDirectories = async () => {
  mkdirSync(minecraft, { recursive: true });
  mkdirSync(data, { recursive: true });
};