package main

import (
	"fmt"
	"log"
	"redcode-backend/db"
	"redcode-backend/handlers"
	"redcode-backend/middleware"
	"runtime"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	if err := db.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	app := fiber.New(fiber.Config{
		AppName:               "redcode-api",
		DisableStartupMessage: true,
	})

	// Mimic PM2 Dashboard Log Format
	app.Use(logger.New(logger.Config{
		Format: "\033[1;32mredcode-api > \033[0m[\033[1;37m${time}\033[0m] [\033[1;32mINFO\033[0m] ${method} ${path} ${status} ${latency}\n",
		TimeFormat: "2006-01-02T15:04:05.000Z",
		TimeZone: "UTC",
	}))

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Content-Type, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))

	api := app.Group("/api")

	// Public routes
	api.Get("/script", handlers.GetScript)
	api.Post("/register", handlers.Register)
	api.Post("/login", handlers.Login)
	api.Get("/stats", handlers.GetStats)
	api.Post("/verify", handlers.VerifySession)
	api.Get("/thumbnail", handlers.Thumbnail)
	api.Post("/gamedata", handlers.GameData)

	// Protected routes
	api.Post("/auth/token", handlers.GetToken)
	
	api.Use(middleware.VerifyJWT)
	api.Get("/bots", handlers.GetBots)
	api.Post("/bots", handlers.AddBot)
	api.Delete("/bots/:id", handlers.DeleteBot)
	api.Put("/user/settings", handlers.UpdateSettings)
	api.Post("/user/apikey", handlers.RegenerateAPIKey)

	// Background status checker
	go func() {
		for {
			time.Sleep(30 * time.Second)
			checkBotStatus()
		}
	}()

	// PM2 Dashboard Style Startup
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	fmt.Print("\033[H\033[2J") // Clear Screen
	fmt.Println("\033[1;37m PM2 Dashboard\033[0m")
	fmt.Println("\033[1;34m ┌ Process List ──────────────────────────┐ ┌ redcode-api Logs ──────────────────────────────────────────┐\033[0m")
	fmt.Printf("\033[1;34m │\033[0m [ 0 ] \033[1;37mredcode-api\033[0m     Mem: \033[1;32m%-5d\033[0m MB \033[1;34m│ │\033[0m \033[1;32mredcode-api > \033[0mStarting server on port :8080...           \033[1;34m│\033[0m\n", m.Alloc/1024/1024)
	fmt.Printf("\033[1;34m │\033[0m [ 1 ] \033[1;34mdb-sync\033[0m         Mem: \033[1;32m%-5d\033[0m MB \033[1;34m│ │\033[0m \033[1;32mredcode-api > \033[0mDashboard: http://159.89.198.248/          \033[1;34m│\033[0m\n", 12)
	fmt.Println("\033[1;34m │                                        │ │                                                          │\033[0m")
	fmt.Println("\033[1;34m │                                        │ │                                                          │\033[0m")
	fmt.Println("\033[1;34m └────────────────────────────────────────┘ └──────────────────────────────────────────────────────────┘\033[0m")
	fmt.Println("\033[1;34m ┌ Custom Metrics ────────────────────────┐ ┌ Metadata ────────────────────────────────────────────────┐\033[0m")
	fmt.Printf("\033[1;34m │\033[0m Used Heap Size     \033[1;37m%10.2f MiB\033[0m \033[1;34m│ │\033[0m App Name           \033[1;37mredcode-api                           \033[1;34m│\033[0m\n", float64(m.Alloc)/1024/1024)
	fmt.Printf("\033[1;34m │\033[0m Heap Usage          \033[1;37m%10.2f %%\033[0m   \033[1;34m│ │\033[0m Namespace          \033[1;37mdefault                               \033[1;34m│\033[0m\n", 66.36) 
	fmt.Printf("\033[1;34m │\033[0m Heap Size           \033[1;37m%10.2f MiB\033[0m \033[1;34m│ │\033[0m Version            \033[1;37m2.0.0                                 \033[1;34m│\033[0m\n", float64(m.Sys)/1024/1024)
	fmt.Printf("\033[1;34m │\033[0m Event Loop Latency  \033[1;37m%10.2f ms\033[0m  \033[1;34m│ │\033[0m Restarts           \033[1;37m0                                     \033[1;34m│\033[0m\n", 0.22)
	fmt.Printf("\033[1;34m │\033[0m                     \033[1;37m          \033[0m \033[1;34m│ │\033[0m Uptime             \033[1;37m12h                                   \033[1;34m│\033[0m\n")
	fmt.Println("\033[1;34m └────────────────────────────────────────┘ └──────────────────────────────────────────────────────────┘\033[0m")
	fmt.Println("\033[1;37m left/right: switch boards | up/down/mouse: scroll | Ctrl-C: exit\033[0m")
	fmt.Println()

	log.Fatal(app.Listen("0.0.0.0:8080"))
}

func checkBotStatus() {
	database := db.GetDB()
	now := time.Now()
	updated := false
	timeout := 2 * time.Minute

	for i := range database.Bots {
		bot := &database.Bots[i]
		if bot.LastUpdate != nil && bot.Status == "online" {
			if now.Sub(*bot.LastUpdate) > timeout {
				fmt.Printf("\033[1;31m[ALARM ]\033[0m \033[1;32m%-15s\033[0m │ Status: \033[1;31mOFFLINE\033[0m (No response > 2m)\n", bot.Name)
				bot.Status = "offline"
				updated = true
			}
		}
	}

	if updated {
		db.SaveDB()
	}
}

