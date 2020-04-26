FROM node
WORKDIR /usr/src/app
ADD VERSION .
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node","dist/main"]
