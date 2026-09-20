# Use Node.js 22 LTS as base image (required for node:sqlite DatabaseSync)
FROM node:22-alpine

# Create app directory
WORKDIR /usr/src/app

# Install build dependencies for better-sqlite3 (python, make, g++)
RUN apk add --no-cache python3 make g++

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy the rest of the application files
COPY . .

# Expose the application port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD [ "npm", "run", "start" ]
