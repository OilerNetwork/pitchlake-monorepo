FROM ubuntu:24.04

WORKDIR /app

COPY . .

RUN go build -o event-processor main.go

CMD ["./event-processor"]