# ─── Frontend Dockerfile ───
FROM node:20-alpine

WORKDIR /app

# Copy package files FIRST
COPY package*.json ./

# Install dependencies
RUN npm install

# --- TAMBAHKAN BARIS INI ---
# Salin seluruh file frontend (src, public, tsconfig, dll)
COPY . .

# Expose port yang Anda inginkan
EXPOSE 3010

# Perintahkan Next.js jalan di port 3010 dan bind ke 0.0.0.0
CMD ["npm", "run", "dev", "--", "-p", "3010", "-H", "0.0.0.0"]
