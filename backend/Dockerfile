FROM ubuntu:24.04 AS build

# Install Go and build dependencies
RUN apt-get -qq update && \
    apt-get -qq install -y golang ca-certificates

WORKDIR /app

# Copy the Go module files
COPY go.mod .
COPY go.sum .

# Download the Go module dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN go build -o /websocket .

# Runtime stage
FROM ubuntu:24.04

# Install necessary runtime dependencies
RUN apt-get -qq update && \
    apt-get -qq install -y ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from build stage
COPY --from=build /websocket /websocket

EXPOSE 8080

CMD ["/websocket"]
