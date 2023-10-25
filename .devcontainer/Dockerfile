FROM node:lts-alpine3.18

# Install bash and git
RUN apk add --no-cache bash
RUN apk add --no-cache git

# Install typescript and ts-node
RUN npm install -g typescript
RUN npm install -g ts-node

# Install Angular CLI
RUN npm install -g @angular/cli