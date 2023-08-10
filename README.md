The purpose of this project is to provide a simple docker image that allows you to run a minecraft server with the following benefits
- Being able to change the version by adjusting an environmental variable
- No need to rebuild or update the image just to update or change the version
- Automatic security updates
- The server runs with less privileges as a security measure
- The server automatically goes to sleep when nobody is online and wakes back up when someone joins to avoid idle memory and cpu usage