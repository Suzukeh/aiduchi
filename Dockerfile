FROM node:22-slim
WORKDIR /srv
COPY package.json package-lock.json* ./
COPY packages/protocol ./packages/protocol
COPY server ./server
RUN npm install --workspace @aiduchi/server --include=dev || npm install
RUN npm --prefix packages/protocol run build || true
EXPOSE 3000
CMD ["npm", "--prefix", "server", "run", "start"]
