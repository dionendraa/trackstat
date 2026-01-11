package handlers

import (
	"redcode-backend/db"
	"redcode-backend/models"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

func GetBots(c *fiber.Ctx) error {
	userIdStr := c.Query("userId")
	userId, _ := strconv.ParseInt(userIdStr, 10, 64)

	database := db.GetDB()
	var userBots []models.Bot
	for _, b := range database.Bots {
		if b.UserID == userId {
			userBots = append(userBots, b)
		}
	}

	return c.JSON(fiber.Map{"bots": userBots})
}

func AddBot(c *fiber.Ctx) error {
	var body struct {
		UserID int64  `json:"userId"`
		Name   string `json:"name"`
		Token  string `json:"token"`
		GameID string `json:"gameId"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid body"})
	}

	newBot := models.Bot{
		ID:              time.Now().UnixNano() / 1000000,
		UserID:          body.UserID,
		Name:            body.Name,
		Status:          "offline",
		Coin:            0,
		FishCaught:      0,
		RarestFish:      "None",
		Rarity:          "common",
		BackpackCurrent: 0,
		BackpackMax:     100,
		Token:           body.Token,
		GameID:          body.GameID,
	}

	database := db.GetDB()
	database.Bots = append(database.Bots, newBot)
	db.AddBotToIndex(&database.Bots[len(database.Bots)-1])
	// No immediate SaveDB() here, background saver handles it

	return c.JSON(fiber.Map{"success": true, "bot": newBot})
}

func DeleteBot(c *fiber.Ctx) error {
	botIdStr := c.Params("id")
	botId, _ := strconv.ParseInt(botIdStr, 10, 64)

	db.LockDB()
	defer db.UnlockDB()
	
	database := db.GetDB()
	found := false
	for i, b := range database.Bots {
		if b.ID == botId {
			db.RemoveBotFromIndex(b.Name)
			database.Bots = append(database.Bots[:i], database.Bots[i+1:]...)
			found = true
			break
		}
	}

	if !found {
		return c.Status(404).JSON(fiber.Map{"error": "Bot not found"})
	}

	return c.JSON(fiber.Map{"success": true})
}

func GetStats(c *fiber.Ctx) error {
	database := db.GetDB()
	totalUsers := len(database.Users)
	totalBots := len(database.Bots)
	var totalCoins int64
	var totalFish int

	for _, b := range database.Bots {
		totalCoins += b.Coin
		totalFish += b.FishCaught
	}

	return c.JSON(fiber.Map{
		"totalUsers": totalUsers,
		"totalBots":  totalBots,
		"totalCoins": totalCoins,
		"totalFish":  totalFish,
	})
}

