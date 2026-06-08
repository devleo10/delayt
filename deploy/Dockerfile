FROM node:20-alpine AS build
WORKDIR /app

COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src packages/shared/src
RUN cd packages/shared && npm install && npm run build

COPY app/package.json app/tsconfig.json app/next.config.js app/
COPY app/src app/src
WORKDIR /app/app
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app

COPY --from=build /app/packages/shared /app/packages/shared
COPY --from=build /app/app/.next /app/app/.next
COPY --from=build /app/app/node_modules /app/app/node_modules
COPY --from=build /app/app/package.json /app/app/
COPY --from=build /app/app/next.config.js /app/app/next.config.js

WORKDIR /app/app
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "node_modules/.bin/next", "start"]
