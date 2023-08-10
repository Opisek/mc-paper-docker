import acceptEula from "./modules/eula.js";
import installServer from "./modules/installer.js";
import { createDirectories } from "./paths.js";

async function main() {
  await acceptEula(process.env.EULA == "true");
  await createDirectories();
  await installServer();
}

main();