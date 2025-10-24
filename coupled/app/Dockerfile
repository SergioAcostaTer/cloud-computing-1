# app/Dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 80
CMD ["npm", "start"]
