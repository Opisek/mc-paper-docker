import { exit } from "process";

import acceptEula from "./modules/eula.js";
import runMockServer from "./modules/mock.js";
import watchServer from "./modules/watcher.js";
import { getEnvironmental } from "./modules/config.js";
import { createDirectories } from "./modules/paths.js";
import { StartupError, runServer } from "./modules/server.js";
import { installServer, clearBinariesData } from "./modules/installer.js";

import { Environmental } from "./typings/config.js";

async function main(environmental: Environmental) {
  const [ serverBinaries, serverVersion ] = await installServer();

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

  console.log("Starting mock server");
  await runMockServer(serverVersion);
  console.log("The mock server has closed.");

  // TODO: add graceful shutdown
}

(async () => {
  const environmental = getEnvironmental();
  createDirectories();
  await acceptEula(environmental.eula);
  while (true) await main(environmental);
})();