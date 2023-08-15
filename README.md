# Table of Contents
- [Abstract](#abstract)
- [Installation](#installation)
- [How It Works](#how-it-works)
- [Known Issues](#known-issues)

# Abstract
The purpose of this project is to provide a simple way to run a minecraft with the following benefits
- Minimal maintenance
- Easy to change the server version
- Automatic security updates
- More security due to deelevated permissions
- The server automatically goes to sleep when nobody is online and wakes back up when someone joins to avoid idle memory and cpu usage

# Installation
1. Make sure you have [docker](https://docs.docker.com/engine/install/) installed

2. Make sure you have [docker compose](https://docs.docker.com/compose/install/)

3. Copy the following `docker-compose.yml` file (you can also find it in the source code):
  ```yml
  version: "3.9"
  services:
    minecraft:
      container_name: minecraft
      image: opisek/mc-paper-docker:latest
      volumes:
        - /srv/minecraft:/app/minecraft # change /srv/minecraft to the directory you want to store minecraft files in
        - minecraft-data:/app/data
      network_mode: host
      environment:
        - EULA=false      # change this to true if you agree to minecraft eula f
        - VERSION=latest  # minecraft version or "latest"
        - CHANNEL=default # change this to experimental for experimental paper builds
        - GRACE=180       # amount of time in seconds of nobody being online before stopping the server
        - XMS=8G          # minimum amount of ram to allocate to the server
        - XMX=8G          # maximum amount of ram to allocate to the server
        - UID=9999        # minecraft files user id
        - GID=9999        # minecraft files group id
      restart: unless-stopped
      stdin_open: true
      tty: true
      build:
        context: .
        dockerfile: Dockerfile
  volumes:
    minecraft-data:
  ```

4. Adjust the mount point for minecraft files in the `docker-compose.yml` file.

  For example, if you want your minecraft files to be on your Desktop and you're using Windows,
  you should adjust the corresponding line to
  ```yml
  - "C:/Users/Username/Desktop/minecraft:/app/minecraft"
  ```

5. Adjust the environmental variables in the `docker-compose.yml` file.

  For an explanation of the variables, consult the following table:

  Variable|Meaning
  -|-
  `EULA` | Should be `true` if you agree to [Minecraft's EULA](https://www.minecraft.net/en-us/eula)
  `VERSION` | The minecraft version that should be installed, e.g. `1.20.1` or `latest` for the most current version
  `CHANNEL` | The channel for PaperMC builds to be used: `default` for normal builds and `experimental` for potentally unstable builds
  `GRACE` | The amount to time to wait before putting the server to sleep when nobody is online
  `XMX` | The minimum amount of RAM to allocate to the minecraft server
  `XMX` | The maximum amount of RAM to allocate to the minecraft server
  `UID` | The user id to use for the server files
  `GID` | The group id to use for the server files

6. Open the directory with the `docker-compose.yml` file and run
  ```bash
  docker-compose up . -d
  ```

7. Run the following command to view the server console
  ```bash
  docker attach minecraft 
  ```

8. Once the server has booted up, make sure to add yourself to the list of operators
  ```bash
  op Username 
  ```

9. You can now close the terminal and join your minecraft server.

# How It Works
The docker container runs a Node.js script that
- Downloads the latest build of the requested minecraft version
- Runs the Minecraft server
- Periodically checks how many players are online
- Once there have been no players online for the duration of the grace period, the Minecraft server shuts down
- Now, a mock server is started, that emulates your server in Minecraft's server selection menu. It uses the same motd, player count, and server icon, as your real server.
- The moment somebody tries to join the mock server, it is closed, and we go back to the first step

# Known Issues
- The mock server doesn't respect IP bans:

  If someone is ip-banned, they are still able to join the mock server, and by that, start the real server. They still cannot join the real server, only trigger the startup.

- The mock server doesn't respect the "enableStatus" property of `server.properties`.

  The status should not be displayed in the server selection menu if this property is set to
  true, however the mock server will always display the status.

- In case the latest version only has experimantal builds, but the `default` channel has
  been selected, then the installer will fail to download any binaries.