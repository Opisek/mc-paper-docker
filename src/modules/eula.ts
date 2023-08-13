import { join } from "path";
import { writeFile } from "fs/promises";

import { minecraft } from "./paths.js";

export default async function acceptEula(accept: boolean) {
  return writeFile(join(minecraft, "eula.txt"), `eula=${accept ? "true" : "false"}`);
}