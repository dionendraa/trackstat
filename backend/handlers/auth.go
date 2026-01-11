package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"redcode-backend/db"
	"redcode-backend/middleware"
	"redcode-backend/models"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func Register(c *fiber.Ctx) error {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid body"})
	}

	database := db.GetDB()
	for _, u := range database.Users {
		if u.Username == body.Username {
			return c.Status(400).JSON(fiber.Map{"error": "Username already exists"})
		}
	}

	apiKeyBytes := make([]byte, 16)
	rand.Read(apiKeyBytes)
	apiKey := "ts_" + hex.EncodeToString(apiKeyBytes)

	newUser := models.User{
		ID:        time.Now().UnixNano() / 1000000,
		Username:  body.Username,
		Password:  body.Password,
		APIKey:    apiKey,
		CreatedAt: time.Now(),
	}

	database.Users = append(database.Users, newUser)
	db.SaveDB()

	return c.JSON(fiber.Map{
		"success": true,
		"user":    fiber.Map{"id": newUser.ID, "username": newUser.Username},
	})
}

func Login(c *fiber.Ctx) error {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid body"})
	}

	database := db.GetDB()
	var foundUser *models.User
	for _, u := range database.Users {
		if u.Username == body.Username && u.Password == body.Password {
			foundUser = &u
			break
		}
	}

	if foundUser == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid username or password"})
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"role":   "user",
		"userId": foundUser.ID,
		"exp":    time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString(middleware.JWTSecret)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"token":   tokenString,
		"user": fiber.Map{
			"id":       foundUser.ID,
			"username": foundUser.Username,
			"apiKey":   foundUser.APIKey,
		},
	})
}

func GetToken(c *fiber.Ctx) error {
	var body struct {
		UserID int64 `json:"userId"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid body"})
	}

	database := db.GetDB()
	var foundUser *models.User
	for _, u := range database.Users {
		if u.ID == body.UserID {
			foundUser = &u
			break
		}
	}

	if foundUser == nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"role": "user",
		"exp":  time.Now().Add(time.Hour).Unix(),
	})

	tokenString, err := token.SignedString(middleware.JWTSecret)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"token":   tokenString,
		"user":    fiber.Map{"id": foundUser.ID, "username": foundUser.Username},
	})
}

func VerifySession(c *fiber.Ctx) error {
	var body struct {
		UserID int64 `json:"userId"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid body"})
	}

	database := db.GetDB()
	var foundUser *models.User
	for _, u := range database.Users {
		if u.ID == body.UserID {
			foundUser = &u
			break
		}
	}

	if foundUser == nil {
		return c.Status(401).JSON(fiber.Map{"valid": false})
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"role":   "user",
		"userId": foundUser.ID,
		"exp":    time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, _ := token.SignedString(middleware.JWTSecret)

	return c.JSON(fiber.Map{
		"valid": true,
		"user": fiber.Map{
			"id":       foundUser.ID,
			"username": foundUser.Username,
			"apiKey":   foundUser.APIKey,
			"token":    tokenString,
		},
	})
}

func UpdateSettings(c *fiber.Ctx) error {
	var body struct {
		UserID   int64  `json:"userId"`
		Username string `json:"username"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid body"})
	}

	database := db.GetDB()
	found := false
	var updatedUser *models.User
	for i := range database.Users {
		if database.Users[i].ID == body.UserID {
			database.Users[i].Username = body.Username
			updatedUser = &database.Users[i]
			found = true
			break
		}
	}

	if !found {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	db.SaveDB()
	return c.JSON(fiber.Map{"success": true, "user": updatedUser})
}

func RegenerateAPIKey(c *fiber.Ctx) error {
	var body struct {
		UserID int64 `json:"userId"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid body"})
	}

	database := db.GetDB()
	found := false
	var newKey string
	for i := range database.Users {
		if database.Users[i].ID == body.UserID {
			apiKeyBytes := make([]byte, 16)
			rand.Read(apiKeyBytes)
			newKey = "ts_" + hex.EncodeToString(apiKeyBytes)
			database.Users[i].APIKey = newKey
			found = true
			break
		}
	}

	if !found {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	db.SaveDB()
	return c.JSON(fiber.Map{"success": true, "apiKey": newKey})
}

