import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

export const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const minecraft = join(rootDir, "minecraft");
export const data = join(rootDir, "data");
export const versionFile = join(data, ".version");
export const buildFile = join(data, ".build");