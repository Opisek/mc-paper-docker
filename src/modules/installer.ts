import { readFileSync } from "fs";
import * as paths from "../paths.js";
import { exit } from "process";
import fetch from "node-fetch";

type PaperApiVersionsResponse = {
  versions: string[]
}
type PaperApiBuildsResponse = {
  builds: {
    build: number,
    channel: string,
    downloads: {
      application: {
        name: string
      }
    }
  }[]
}

function getInstalledVersion(): string {
  try {
    return readFileSync(paths.versionFile).toString();
  } catch (_) {
    return null;
  }
}

function getInstalledBuild(): number {
  try {
    return Number.parseInt(readFileSync(paths.buildFile).toString());
  } catch (_) {
    return null;
  }
}

async function getPaperVersions() {
  try {
    const response = await (await fetch("https://api.papermc.io/v2/projects/paper")).json() as PaperApiVersionsResponse;
    return response.versions;
  } catch (error) {
    return null;
  }
}

async function getPaperBuilds(version: string) {
  try {
    const response = await (await fetch(`https://api.papermc.io/v2/projects/paper/versions/${version}/builds`)).json() as PaperApiBuildsResponse;
    return response.builds;
  } catch (error) {
    return null;
  }
}

export default async function installServer() {
  // Check Version
  let requestedVersion = process.env.VERSION || "latest";
  const currentVersion = getInstalledVersion();
  const availableVersions = await getPaperVersions();
  const isInstalled = requestedVersion == currentVersion;
  
  if (!availableVersions) {
    if (isInstalled) return;
    console.error("Could not contact PaperMC website.");
    exit(1);
  }

  if (requestedVersion == "latest") {
    requestedVersion = availableVersions[availableVersions.length - 1];
  } else if (!availableVersions.includes(requestedVersion)) {
    console.error(`There doesn't exist a PaperMC server for version "${requestedVersion}".`);
    exit(1);
  }

  // Check Build
  const currentBuild = getInstalledBuild();
  const availableBuilds = await getPaperBuilds(requestedVersion);

  if (!availableBuilds) {
    if (isInstalled) return;
    console.error("Could not contact PaperMC website.");
    exit(1);
  }

  const latestBuild = Math.max(...(availableBuilds.map(x => x.build)));

  if (isInstalled) {
    if (currentBuild >= latestBuild) {
      console.log("Latest build already installed.");
      return;
    }

    console.log("New build found.");
  }

  // Install
  console.log(`Installing ${requestedVersion} build ${latestBuild}`);
}