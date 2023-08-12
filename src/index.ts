import { exit } from "process";
import acceptEula from "./modules/eula.js";
import { installServer, clearBinariesData } from "./modules/installer.js";
import { runServer, StartupError } from "./modules/server.js";
import { createDirectories } from "./paths.js";
import watchServer from "./modules/watcher.js";
import { Configuration, getConfiguration } from "./modules/environmental.js";

async function main(config: Configuration) {
  const serverBinaries = await installServer();

  let serverInstance;
  try {
    console.log("Starting minecraft server.");
    serverInstance = await runServer(config, serverBinaries);
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

  await watchServer(config, serverInstance);
  console.log("The server has closed.");

  // TODO: start mock server and close once sometimes joins
  //       note that it must use the port specified in minecraft/server.properties
  // TODO: add graceful shutdown
}

(async () => {
  const config = getConfiguration();
  createDirectories();
  await acceptEula(config.eula);
  while (true) await main(config);
})();