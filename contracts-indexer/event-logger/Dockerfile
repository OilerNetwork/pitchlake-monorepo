# Stage 1: Build golang dependencies and binaries
FROM golang:1.25-bookworm AS build

ARG RUST_VERSION=1.86.0

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gcc make git build-essential \
    libjemalloc-dev libbz2-dev pkg-config \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl https://sh.rustup.rs -sSf | bash -s -- -y --default-toolchain ${RUST_VERSION} --profile minimal
ARG VM_DEBUG=false

WORKDIR /plugin

RUN git clone https://github.com/NethermindEth/juno.git juno

#RUN git submodule update --init --remote --recursive
RUN bash -c 'cd juno && source ~/.cargo/env && VM_DEBUG=${VM_DEBUG} make juno'

RUN pwd
RUN ls

# Then build the plugin
COPY plugin/ ./plugin/
COPY db/ ./db/
COPY models/ ./models/
COPY network/ ./network/
COPY utils/ ./utils/
COPY go.mod ./
COPY go.sum ./
COPY go.work ./
COPY Makefile ./

RUN go mod tidy
RUN make build

# Stage 2: Run Juno with the plugin
FROM debian:bookworm-slim

# Install necessary runtime dependencies
RUN apt-get -qq update && \
    apt-get -qq install -y ca-certificates curl gawk grep libjemalloc-dev libjemalloc2 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV L1_URL=${L1_URL}
# Copy the Juno binary and the plugin from the build stage
COPY --from=build /plugin/db/migrations ./db/migrations
COPY --from=build /plugin/juno/build/juno ./build/
COPY --from=build /plugin/myplugin.so ./


# Run Juno with the plugin
CMD ["bash", "-c", "./build/juno --plugin-path myplugin.so --http --http-port=6060 --http-host=0.0.0.0 --network sepolia --rpc-cors-enable --eth-node ${L1_URL} --db-path=/snapshots/"]

