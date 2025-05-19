FROM golang:1.24-alpine AS builder

WORKDIR /src/eventhub-backend

COPY eventhub-backend/go.mod eventhub-backend/go.sum ./
RUN go mod download

COPY eventhub-backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/eventhub ./cmd

FROM alpine:3.21

RUN apk add --no-cache ca-certificates

WORKDIR /app
COPY --from=builder /out/eventhub ./eventhub

EXPOSE 3000
CMD ["./eventhub"]
