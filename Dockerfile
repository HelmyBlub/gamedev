FROM node:14-alpine

# Set the working directory to /app
WORKDIR /app

# Copy package.json and package-lock.json to the container's /app directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the container's /app directory
COPY . .

# Compile TypeScript code
RUN npm run build

# Expose port 3000 for the application to listen on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
