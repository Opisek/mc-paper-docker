import { exit } from "process";
import { ChildProcessWithoutNullStreams } from "child_process";

import acceptEula from "./modules/eula.js";
import watchServer from "./modules/watcher.js";
import { getEnvironmental } from "./modules/config.js";
import { createDirectories } from "./modules/paths.js";
import { StartupError, runServer } from "./modules/server.js";
import { handleMockServer, MockServer, runMockServer } from "./modules/mock.js";
import { installServer, clearBinariesData } from "./modules/installer.js";

import { Environmental } from "./typings/config.js";
import { pingServer } from "./modules/ping.js";

let serverInstance: ChildProcessWithoutNullStreams;
let mockInstance: MockServer;

async function main(environmental: Environmental) {
  const [ serverBinaries, serverVersion ] = await installServer();

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
  serverInstance = null;
  console.log("The server has closed.");

  console.log("Starting mock server");
  mockInstance = await runMockServer(serverVersion);
  await handleMockServer(mockInstance);
  mockInstance = null;
  console.log("The mock server has closed.");
}

async function shutdown() {
  console.log("Shutting down...");
  if (serverInstance) {
    serverInstance.stdin.write("stop\n");
    await new Promise((resolve) => serverInstance.on("close", resolve));
  } else if (mockInstance) {
    mockInstance.close();
  }
  exit(0);
}

// TODO: restore after testing is complete
pingServer("smp.opisek.net", 25565).then(console.log).catch(console.error);

//process.on("SIGTERM", shutdown);
//process.on("SIGINT", shutdown);
//
//(async () => {
//  const environmental = getEnvironmental();
//  createDirectories();
//  await acceptEula(environmental.eula);
//  while (true) await main(environmental);
//})();