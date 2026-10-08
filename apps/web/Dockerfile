FROM node:22-slim
WORKDIR /srv
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
