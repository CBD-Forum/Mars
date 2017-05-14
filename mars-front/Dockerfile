FROM node

RUN mkdir -p /mars

WORKDIR /mars

COPY .babelrc .babelrc
COPY .npmrc .npmrc
COPY .npmrc .npmrc
COPY package.json package.json
COPY server.js server.js
COPY config.js config.js
COPY app.js app.js
COPY log4js.json log4js.json
COPY mongo.js mongo.js
COPY common common
COPY public public
COPY routes routes
COPY views views

RUN npm install

EXPOSE 3000
CMD ["npm", "run", "dev"]