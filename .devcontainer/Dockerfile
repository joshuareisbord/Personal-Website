FROM node:lts-alpine3.20

RUN apk add --no-cache bash git

RUN npm install -g typescript
RUN npm install -g ts-node

RUN git config --global --add safe.directory /workspace