FROM node:10

COPY . /app/
WORKDIR /app

RUN npm install --only=production
CMD [ "npm", "start" ]

