# Use a glibc-based Node image because the lockfile installs Rollup's
# linux-x64-gnu native package, which is incompatible with Alpine/musl.
FROM node:20-slim

# Set work directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project
COPY . .

# Expose port 5173
EXPOSE 5173

# Start the application
CMD ["npm", "run", "dev", "--", "--host"]
