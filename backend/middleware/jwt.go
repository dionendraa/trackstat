package middleware

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

var JWTSecret = []byte("ROBLOXGGIN2025DAWG")

func VerifyJWT(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		fmt.Println("[JWT] Missing Authorization header")
		return c.Status(401).JSON(fiber.Map{"error": "JWT token required"})
	}

	tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return JWTSecret, nil
	})

	if err != nil {
		fmt.Printf("[JWT] Error parsing token: %v\n", err)
		return c.Status(401).JSON(fiber.Map{"error": "Invalid JWT token"})
	}

	if !token.Valid {
		fmt.Println("[JWT] Token is invalid")
		return c.Status(401).JSON(fiber.Map{"error": "Invalid JWT token"})
	}

	return c.Next()
}

