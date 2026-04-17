# ─── Backend Dockerfile ───
FROM node:20-alpine

WORKDIR /app

# Copy package files FIRST
COPY package*.json ./

# Install dependencies
RUN npm install

# Salin seluruh file backend (termasuk app.js) ke dalam container
COPY . .

# Sesuaikan EXPOSE dengan port yang Anda gunakan (3011)
EXPOSE 3011

# Start the server
CMD ["npm", "run", "dev"]
