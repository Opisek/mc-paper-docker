#!/bin/sh
set -e
 
# Add local user
if ! id docker >/dev/null 2>&1; then
  USER_ID=${UID:-9999}
  GROUP_ID=${GID:-9999}
  echo "Using user:group $USER_ID:$GROUP_ID"
  addgroup --g $GROUP_ID docker
  adduser docker -u $USER_ID --ingroup docker --shell /bin/sh --disabled-password --gecos ""
  mkdir -p minecraft
  mkdir -p data
fi

# Fix permissions
echo "Fixing permissions..."
chown -R docker:docker ./minecraft
chmod -R 770 ./minecraft
chown -R docker:docker ./data
chmod -R 770 ./data

# Start server 
echo "Starting up..."
su-exec $USER_ID:$GROUP_ID npm run start
