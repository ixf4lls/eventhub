package main

import (
	"eventhub-backend/internal/config"
	"eventhub-backend/internal/database"
	"eventhub-backend/internal/handlers"
	"eventhub-backend/internal/middleware"
	"eventhub-backend/internal/repository"
	"eventhub-backend/internal/service"
	customJwt "eventhub-backend/pkg/jwt"
	"fmt"

	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
)

func main() {
	cfg := config.Load()
	db := database.ConnectToDB(cfg)
	database.MigrageDB(db)

	var jwtManager customJwt.Manager = customJwt.NewJwtManager(cfg.JwtSecretKey)

	// repos
	userRepo := repository.NewGormUserRepository(db)
	eventRepo := repository.NewGormEventRepository(db)
	organizationRepo := repository.NewGormOrganizationRepository(db)
	notificationRepo := repository.NewGormNotificationRepository(db)

	// services
	authService := service.NewAuthService(cfg, *userRepo, jwtManager)
	registerService := service.NewRegisterService(*userRepo)
	userService := service.NewUserService(*userRepo)
	eventService := service.NewEventService(*eventRepo, *organizationRepo, cfg.ElasticsearchURL)
	organizationService := service.NewOrganizationService(*organizationRepo)
	notificationService := service.NewNotificationService(*notificationRepo, *eventRepo)

	// handlers
	authHandler := handlers.NewAuthHandler(authService, registerService)
	eventHandler := handlers.NewEventHandler(eventService, userService, notificationService)
	userHandler := handlers.NewUserHandler(userService)
	organizationHandler := handlers.NewOrganizationHandler(organizationService)
	notificationHandler := handlers.NewNotificationHandler(notificationService)

	// middleware
	authMW := middleware.NewMiddleware(jwtManager)

	e := echo.New()
	e.Use(echoMiddleware.CORS())
	e.POST("/reindex", eventHandler.UpdateSearchIndex) // POST /reindex

	api := e.Group("/api")

	// public
	api.POST("/refresh", authHandler.Refresh)   // POST /api/refresh
	api.POST("/register", authHandler.Register) // POST /api/register
	api.POST("/login", authHandler.Login)       // POST /api/login

	// authorized
	auth := api.Group("", authMW.AuthRequired)

	// -- events --
	events := auth.Group("/events")
	events.GET("", eventHandler.GetAllUser)                       // GET /api/events
	events.GET("/:id", eventHandler.GetByID)                      // GET /api/events/:id
	events.GET("/:id/participants", eventHandler.GetParticipants) // GET /api/events/:id/participants
	events.POST("/:id/join", eventHandler.Join)                   // POST   /api/events/:id/join
	events.DELETE("/:id/quit", eventHandler.Quit)                 // DELETE /api/events/:id/quit
	events.DELETE("/:id/delete", eventHandler.Delete)             // DELETE /api/events/:id/delete

	// -- organizations --
	organizations := auth.Group("/organizations")
	organizations.GET("", organizationHandler.GetAll)                 // GET /api/organizations
	organizations.GET("/:id/events", organizationHandler.GetEvents)   // GET /api/organizations/:id/events
	organizations.GET("/:id", organizationHandler.GetByID)            // GET /api/organizations/:id
	organizations.GET("/:id/members", organizationHandler.GetMembers) // GET /api/organizations/:id/members
	organizations.POST("", organizationHandler.Create)                // POST /api/organizations/
	organizations.POST("/join/:code", organizationHandler.JoinByCode) // POST /api/organizations/join/:code

	// -- organizations (only creator) --
	orgCreator := organizations.Group("/:id", authMW.IsOrganizationCreator(organizationService))
	orgCreator.POST("/events", eventHandler.Create)                 // POST /api/organizations/:id/events
	orgCreator.PUT("/events/:event_id/update", eventHandler.Update) // PUT  /api/organizations/:id/events/:event_id/update

	// -- notifications --
	notifications := auth.Group("/notifications")
	notifications.GET("", notificationHandler.GetAll)                  // GET /api/notifications
	notifications.POST("/:event_id/:type", notificationHandler.Create) // POST /api/notifications/:event_id/:type

	// -- user --
	users := auth.Group("/users")
	users.GET("/:id", userHandler.GetByID)         // GET /api/users/:id
	users.GET("/profile", userHandler.GetUserData) // GET /api/users/profile

	// daemons
	notificationService.StartScheduler()
	notificationService.StartEventStatusUpdater()
	eventService.StartIndexUpdater()

	e.Start(fmt.Sprintf(":%s", cfg.ServerPort))
}
