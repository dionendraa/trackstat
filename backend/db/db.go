package db

import (
	"encoding/json"
	"os"
	"redcode-backend/models"
	"sync"
	"time"
)

var (
	db       *models.Database
	mutex    sync.RWMutex
	dbPath   = "../database.json"
	botIndex map[string]*models.Bot
)

func InitDB() error {
	mutex.Lock()
	defer mutex.Unlock()

	data, err := os.ReadFile(dbPath)
	if err != nil {
		if os.IsNotExist(err) {
			db = &models.Database{
				Users: []models.User{},
				Bots:  []models.Bot{},
			}
			err = SaveDB()
			if err != nil {
				return err
			}
		} else {
			return err
		}
	} else {
		if err := json.Unmarshal(data, &db); err != nil {
			return err
		}
	}

	// Build index for O(1) bot lookup
	botIndex = make(map[string]*models.Bot)
	for i := range db.Bots {
		botIndex[db.Bots[i].Name] = &db.Bots[i]
	}

	// Start background saver (Every 10 seconds)
	go func() {
		for {
			time.Sleep(10 * time.Second)
			SaveDB()
		}
	}()

	return nil
}

func GetDB() *models.Database {
	mutex.RLock()
	defer mutex.RUnlock()
	return db
}

// GetBotByName provides O(1) lookup for high-performance updates
func GetBotByName(name string) *models.Bot {
	mutex.RLock()
	defer mutex.RUnlock()
	return botIndex[name]
}

// LockDB locks the database for manual modifications
func LockDB() {
	mutex.Lock()
}

// UnlockDB unlocks the database
func UnlockDB() {
	mutex.Unlock()
}

// AddBotToIndex adds a new bot to the lookup map
func AddBotToIndex(bot *models.Bot) {
	mutex.Lock()
	defer mutex.Unlock()
	botIndex[bot.Name] = bot
}

// RemoveBotFromIndex removes a bot from the lookup map
func RemoveBotFromIndex(name string) {
	mutex.Lock()
	defer mutex.Unlock()
	delete(botIndex, name)
}

func SaveDB() error {
	mutex.Lock()
	data, err := json.MarshalIndent(db, "", "  ")
	mutex.Unlock()

	if err != nil {
		return err
	}

	// Write to a temporary file first for safety, then rename
	tempFile := dbPath + ".tmp"
	if err := os.WriteFile(tempFile, data, 0644); err != nil {
		return err
	}
	return os.Rename(tempFile, dbPath)
}

