#!/bin/bash
clear

echo "The following node processes were found and will be killed:"
export PORT=3978
lsof -i :$PORT
kill -9 $(lsof -sTCP:LISTEN -i:$PORT -t)

echo "Installing latest"
#rm -rf node_modules
#rm package-lock.json
ncu -u
npm install
npm audit fix
snyk test

echo "Set env vars"
export ENVIRONMENT="development"
export MOCK="false"

echo "Run the server"
npm run local
