FROM node:24-alpine
WORKDIR /app
COPY server.js db.js views.js i18n.js ./
COPY public ./public
ENV NODE_ENV=production
EXPOSE 80
CMD ["node", "server.js"]
