import acceptEula from "./modules/eula.js";
import installServer from "./modules/installer.js";
import runServer from "./modules/server.js";
import { createDirectories } from "./paths.js";

async function main() {
  await createDirectories();

  const serverBinaries = await installServer();

  runServer(
    serverBinaries,
    (msg) => {
      console.log(`Minecraft server stdout: ${msg}`);
    },
    (msg) => {
      console.log(`Minecraft server stderr: ${msg}`);
    },
    (msg) => {
      console.log(`Minecraft server close:  ${msg}`);
    }
  );

  // TODO: allow user to specify RAM amount
  // TODO: research "corrupt jar" error on abrupt server close
  // TODO: watch over player count -> shutdown server when noone online
  // TODO: start mock server -> start real server when someone joins
}

await acceptEula(process.env.EULA == "true");
main();