FROM golang:1.25-bookworm AS build

WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN go build -o /event-processor .

# Runtime stage
FROM ubuntu:24.04
RUN apt-get -qq update && \
    apt-get -qq install -y ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from build stage
COPY --from=build /event-processor /event-processor

CMD ["/event-processor"]