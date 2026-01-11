#!/bin/bash

echo "=== Testing Bot Status Management ==="
echo

echo "1. Testing POST with new bot 'testbot123':"
curl -s -X POST http://localhost/api/gamedata \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testbot123",
    "data": {
      "Player": {"Coins": 500, "Level": 3, "XP": 1000},
      "Inventory": {"Fishes": [{"Name": "Bass", "Rarity": "common", "Quantity": 5}]}
    }
  }' | jq .

echo
echo "2. Testing POST with existing bot 'ikaeniciaes':"
curl -s -X POST http://localhost/api/gamedata \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ikaeniciaes",
    "data": {
      "Player": {"Coins": 2000, "Level": 7, "XP": 4000},
      "Inventory": {"Fishes": [{"Name": "Shark", "Rarity": "legendary", "Quantity": 1}]}
    }
  }' | jq .

echo
echo "3. Checking current bot status via API:"
curl -s "http://localhost/api/bots?userId=1" | jq '.bots[] | {name, status, coin, fishCaught}'

echo
echo "=== Test completed! Check server logs for details. ==="
echo "Bot will go offline after 2 minutes of inactivity."
