# Step 1: Use a Linux container with GCC and CMake installed
FROM ubuntu:22.04 AS builder

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libsqlite3-dev \
    libasio-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory inside container
WORKDIR /app

# Copy project files
COPY . .

# Build the C++ executable
RUN mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc)

# Step 2: Create a minimal lightweight container to run the app
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy executable and public folder from build stage
COPY --from=builder /app/build/pastevault .
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 18080

# Command to run the application
CMD ["./pastevault"]