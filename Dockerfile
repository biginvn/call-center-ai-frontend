# Build stage
FROM node:20-alpine AS build-stage
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and env file
COPY . .

# Set build arguments from .env file
ARG VITE_API_URL
ARG VITE_SIP_SERVER
ARG VITE_SIP_PORT
ARG NODE_ENV

# Set environment variables
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SIP_SERVER=${VITE_SIP_SERVER}
ENV VITE_SIP_PORT=${VITE_SIP_PORT}
ENV NODE_ENV=${NODE_ENV}

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine AS production-stage

# Copy built app to NGINX's public directory
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 3000

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]