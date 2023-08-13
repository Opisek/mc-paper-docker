import { exit } from "process";

import acceptEula from "./modules/eula.js";
import { runServer } from "./modules/server.js";
import watchServer from "./modules/watcher.js";
import { installServer, clearBinariesData } from "./modules/installer.js";

import { StartupError } from "./typings/server.js";
import { Environmental } from "./typings/config.js";
import { createDirectories } from "./modules/paths.js";
import { getEnvironmental } from "./modules/config.js";

async function main(environmental: Environmental) {
  const serverBinaries = await installServer();

  let serverInstance;
  try {
    console.log("Starting minecraft server.");
    serverInstance = await runServer(environmental, serverBinaries);
  } catch (e) {
    switch (e as StartupError) {
      case StartupError.Corrupted:
        console.log("Reinstalling corrupted server binaries...");
        clearBinariesData(); 
        return;
      case StartupError.Other:
      default:
        console.error("Could not start minecraft server.");
        exit(1);
    }
  }

  await watchServer(environmental, serverInstance);
  console.log("The server has closed.");

  // TODO: start mock server and close once sometimes joins
  //       note that it must use the port specified in minecraft/server.properties
  // TODO: add graceful shutdown
}

(async () => {
  const environmental = getEnvironmental();
  createDirectories();
  await acceptEula(environmental.eula);
  while (true) await main(environmental);
})();