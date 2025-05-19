FROM node:20-alpine AS builder

WORKDIR /app

COPY eventhub-mobile/package.json eventhub-mobile/yarn.lock ./
RUN npm install --legacy-peer-deps

COPY eventhub-mobile/ ./

ARG EXPO_PUBLIC_API_URL=
ARG EXPO_PUBLIC_SEARCH_URL=
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
ENV EXPO_PUBLIC_SEARCH_URL=${EXPO_PUBLIC_SEARCH_URL}
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_NO_WEB_SETUP=1

RUN npx expo export --platform web

FROM nginx:1.27-alpine

COPY eventhub-mobile/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
