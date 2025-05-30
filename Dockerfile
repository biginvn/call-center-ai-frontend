# Build stage
FROM node:20-alpine AS build-stage
WORKDIR /app

# Add build args
ARG NODE_ENV
ARG VITE_OPENAI_API_KEY
ENV NODE_ENV=${NODE_ENV}
ENV VITE_OPENAI_API_KEY=${VITE_OPENAI_API_KEY}

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine AS production-stage

# Copy built app to NGINX's public directory
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy config.json to NGINX's public directory
COPY public/config.json /usr/share/nginx/html/config.json

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 3000

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]

