package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"redcode-backend/db"
	"redcode-backend/middleware"
	"redcode-backend/models"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func GameData(c *fiber.Ctx) error {
	// Optimization: Use a smaller struct for faster parsing
	var body struct {
		Username string `json:"username"`
		Data     struct {
			Player struct {
				Coins  int64 `json:"Coins"`
				Level  int   `json:"Level"`
				XP     int64 `json:"XP"`
				UserId int64 `json:"UserId"`
			} `json:"Player"`
			Inventory map[string][]struct {
				Name     string      `json:"Name"`
				Rarity   string      `json:"Rarity"`
				Tier     int         `json:"Tier"`
				Quantity int         `json:"Quantity"`
				Icon     string      `json:"Icon"`
				Id       interface{} `json:"Id"`
				UUID     string      `json:"UUID"`
				Type     string      `json:"Type"`
			} `json:"Inventory"`
		} `json:"data"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid body"})
	}

	// High Performance: O(1) Lookup
	bot := db.GetBotByName(body.Username)
	if bot == nil {
		return c.Status(404).JSON(fiber.Map{"error": "Bot not found"})
	}

	// Lock for update
	db.LockDB()
	defer db.UnlockDB()

	now := time.Now()
	bot.Status = "online"
	bot.Coin = body.Data.Player.Coins
	bot.Level = body.Data.Player.Level
	bot.XP = body.Data.Player.XP
	bot.LastUpdate = &now

	// Reset flags and items
	bot.HasGhostfinn = false
	bot.HasElement = false
	var backpackItems []models.BackpackItem
	
	totalFish := 0
	rarestFish := "None"
	highestRarity := -1
	rarityOrder := []string{"common", "uncommon", "rare", "epic", "legendary", "mythic", "secret"}

	for category, items := range body.Data.Inventory {
		isFishCategory := strings.ToLower(category) == "fishes"
		for _, item := range items {
			// Fast string comparison
			if item.Name == "Ghostfinn Rod" {
				bot.HasGhostfinn = true
			} else if item.Name == "Element Rod" {
				bot.HasElement = true
			}

			rarityName := strings.ToLower(item.Rarity)
			if item.Tier > 0 {
				switch item.Tier {
				case 1: rarityName = "common"
				case 2: rarityName = "uncommon"
				case 3: rarityName = "rare"
				case 4: rarityName = "epic"
				case 5: rarityName = "legendary"
				case 6: rarityName = "mythic"
				case 7: rarityName = "secret"
				}
			}

			if isFishCategory {
				totalFish += item.Quantity
				for rIdx, rName := range rarityOrder {
					if rName == rarityName && rIdx > highestRarity {
						highestRarity = rIdx
						rarestFish = item.Name
						bot.Rarity = rName
					}
				}
			}

			assetID := ""
			if item.Icon != "" && strings.HasPrefix(item.Icon, "rbxassetid://") {
				assetID = item.Icon[13:]
			}

			backpackItems = append(backpackItems, models.BackpackItem{
				Name:   item.Name,
				Rarity: rarityName,
				Count:  item.Quantity,
				Type:   item.Type,
				ID:     assetID,
				UUID:   item.UUID,
				Icon:   item.Icon, // Send original icon to save processing, frontend can handle proxying
			})
		}
	}

	bot.FishCaught = totalFish
	bot.RarestFish = rarestFish
	bot.BackpackItems = backpackItems
	
	backpackTotal := 0
	for _, item := range backpackItems {
		backpackTotal += item.Count
	}
	bot.BackpackCurrent = backpackTotal

	// Async Logging: Mimic PM2 Dashboard style bot events
	timestamp := time.Now().Format("2006-01-02T15:04:05.000Z")
	go fmt.Printf("\033[1;32mredcode-api > \033[0m[\033[1;37m%s\033[0m] [\033[1;34mBOT\033[0m] \033[1;32m%-15s\033[0m │ Coins: \033[1;33m%-8d\033[0m │ \033[1;32mUPDATE OK\033[0m\n", timestamp, bot.Name, bot.Coin)

	return c.JSON(fiber.Map{"success": true})
}

func GetScript(c *fiber.Ctx) error {
	// Simple user agent check as in server.js
	ua := strings.ToLower(c.Get("User-Agent"))
	robloxExecutors := []string{"syn", "synapse", "krnl", "script-ware", "fluxus", "oxygen", "sentinel", "sirhurt", "electron", "coco", "comet", "trigon", "delta", "hydrogen", "arceus", "evon", "jjsploit", "roblox"}
	
	isExecutor := false
	for _, exec := range robloxExecutors {
		if strings.Contains(ua, exec) {
			isExecutor = true
			break
		}
	}

	hasRobloxHeader := c.Get("Roblox-Id") != "" || c.Get("Roblox-Game") != "" || strings.Contains(ua, "roblox") || ua == "" || strings.Contains(ua, "http.request")

	if !isExecutor && !hasRobloxHeader {
		return c.Status(403).SendString("Access Denied")
	}

	return c.SendFile("../sc.lua")
}

func Thumbnail(c *fiber.Ctx) error {
	assetId := c.Query("assetId")
	if assetId == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Asset ID required"})
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"role": "user",
		"exp":  time.Now().Add(time.Hour).Unix(),
	})

	tokenString, _ := token.SignedString(middleware.JWTSecret)

	client := &http.Client{}
	req, _ := http.NewRequest("GET", fmt.Sprintf("https://apiweb.wintercode.dev/api/thumbnail?assetId=%s", assetId), nil)
	req.Header.Set("Authorization", "Bearer "+tokenString)

	resp, err := client.Do(req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch thumbnail"})
	}
	defer resp.Body.Close()

	var apiResp struct {
		ImageUrl string `json:"imageUrl"`
		Url      string `json:"url"`
	}

	body, _ := io.ReadAll(resp.Body)
	json.Unmarshal(body, &apiResp)

	thumbnailUrl := apiResp.ImageUrl
	if thumbnailUrl == "" {
		thumbnailUrl = apiResp.Url
	}

	if thumbnailUrl == "" {
		return c.Status(500).JSON(fiber.Map{"error": "Invalid thumbnail URL from API"})
	}

	// Fetch actual image
	imgResp, err := http.Get(thumbnailUrl)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to download image"})
	}
	defer imgResp.Body.Close()

	c.Set("Content-Type", "image/png")
	c.Set("Cache-Control", "public, max-age=3600")
	
	io.Copy(c.Response().BodyWriter(), imgResp.Body)
	return nil
}

