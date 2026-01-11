package models

import "time"

type User struct {
	ID        int64     `json:"id"`
	Username  string    `json:"username"`
	Password  string    `json:"password,omitempty"`
	APIKey    string    `json:"apiKey"`
	CreatedAt time.Time `json:"createdAt"`
}

type Bot struct {
	ID              int64          `json:"id"`
	UserID          int64          `json:"userId"`
	Name            string         `json:"name"`
	Status          string         `json:"status"`
	Coin            int64          `json:"coin"`
	Level           int            `json:"level"`
	XP              int64          `json:"xp"`
	FishCaught      int            `json:"fishCaught"`
	RarestFish      string         `json:"rarestFish"`
	Rarity          string         `json:"rarity"`
	BackpackCurrent int            `json:"backpackCurrent"`
	BackpackMax     int            `json:"backpackMax"`
	Token           string         `json:"token"`
	GameID          string         `json:"gameId"`
	LastUpdate      *time.Time     `json:"lastUpdate,omitempty"`
	HasGhostfinn    bool           `json:"hasGhostfinn"`
	HasElement      bool           `json:"hasElement"`
	BackpackItems   []BackpackItem `json:"backpackItems,omitempty"`
}

type BackpackItem struct {
	Name   string `json:"name"`
	Rarity string `json:"rarity"`
	Count  int    `json:"count"`
	Type   string `json:"type"`
	ID     string `json:"id,omitempty"`
	UUID   string `json:"uuid,omitempty"`
	Icon   string `json:"icon,omitempty"`
}

type Database struct {
	Users []User `json:"users"`
	Bots  []Bot  `json:"bots"`
}

