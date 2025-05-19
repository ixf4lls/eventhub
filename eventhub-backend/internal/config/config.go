package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	JwtSecretKey     string
	DBHost           string
	DBPort           string
	DBUser           string
	DBPassword       string
	DBName           string
	DBSSLMode        string
	ElasticsearchURL string
	ServerPort       string
}

func Load() Config {
	// In Docker Compose variables are injected by the environment. Loading
	// .env is still useful for local `go run`, but its absence is not fatal.
	_ = godotenv.Load()

	return Config{
		JwtSecretKey:     getEnv("JWT_SECRET_KEY", "change-me-in-development"),
		DBHost:           getEnv("DB_HOST", "localhost"),
		DBPort:           getEnv("DB_PORT", "5432"),
		DBUser:           getEnv("POSTGRES_USER", "eventhub"),
		DBPassword:       getEnv("POSTGRES_PASSWORD", "eventhub"),
		DBName:           getEnv("POSTGRES_DB", "eventhub"),
		DBSSLMode:        getEnv("DB_SSLMODE", "disable"),
		ElasticsearchURL: getEnv("ELASTICSEARCH_URL", "http://localhost:9200"),
		ServerPort:       getEnv("SERVER_PORT", "3000"),
	}
}

func getEnv(key string, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}

	return fallback
}
