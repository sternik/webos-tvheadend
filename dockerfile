FROM node:22-alpine

#ENV NODE_OPTIONS=--openssl-legacy-provider

# Create app directory
WORKDIR /usr/src/app

# copy git repository
COPY . .

RUN npm install
RUN npm run build
