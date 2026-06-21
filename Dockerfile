# ============================================================
# Dockerfile - CREDO Fuehrungs-Cockpit (Goal/WIG-Modul)
# Zweck: Build + Start der Next.js-App inkl. Prisma-CLI fuer
#        Migration/Seed beim Container-Start (siehe docker-compose).
# Dev-Grade: bewusst einstufig fuer einfache Nachvollziehbarkeit.
# ============================================================
FROM node:20-alpine
WORKDIR /app

# OpenSSL wird von Prisma benoetigt
RUN apk add --no-cache libc6-compat openssl

# Abhaengigkeiten zuerst (besseres Layer-Caching)
COPY package.json ./
RUN npm install

# Quellcode + Build
COPY . .
RUN npx prisma generate && npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
