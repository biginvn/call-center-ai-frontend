# Build stage
FROM node:20-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Set build arguments
ARG VITE_API_URL
ARG NODE_ENV
ENV VITE_API_URL=$VITE_API_URL
ENV NODE_ENV=$NODE_ENV

RUN npm run build

# Production stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set environment variables for runtime
ENV VITE_API_URL=$VITE_API_URL
ENV NODE_ENV=$NODE_ENV

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 