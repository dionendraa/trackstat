local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local LocalPlayer = Players.LocalPlayer

local Replion = require(ReplicatedStorage.Packages.Replion)
local ItemUtility = require(ReplicatedStorage.Shared.ItemUtility)
local data = Replion.Client:WaitReplion("Data")

-- === Helpers ===

local function normalizeMetadata(meta)
    if not meta then return {} end
    if type(meta) ~= "table" then return {} end
    return next(meta) and meta or {}
end

local function assignIfExists(tbl, key, value)
    if value ~= nil then
        tbl[key] = value
    end
end

local function resolveItem(category, id)
    local ok, result
    if category == "Fishing Rods" then
        ok, result = pcall(ItemUtility.GetItemData, ItemUtility, id)
    elseif category == "Baits" then
        ok, result = pcall(ItemUtility.GetBaitData, ItemUtility, id)
    elseif category == "Potions" then
        ok, result = pcall(ItemUtility.GetPotionData, ItemUtility, id)
    elseif category == "Boats" then
        ok, result = pcall(ItemUtility.GetBoatData, ItemUtility, id)
    else
        ok, result = pcall(ItemUtility.GetItemData, ItemUtility, id)
    end
    return ok and result or { Data = { Name = "Unknown", Type = category, Id = id } }
end

local function resolveEnchant(enchantId)
    if not enchantId then return nil end
    local ok, result = pcall(ItemUtility.GetEnchantData, ItemUtility, enchantId)
    if ok and result and result.Data then
        local ench = {
            Id = enchantId,
            Name = result.Data.Name or "Unknown Enchant"
        }
        assignIfExists(ench, "Description", result.Data.Description)
        assignIfExists(ench, "Tier", result.Data.Tier)
        assignIfExists(ench, "Icon", result.Data.Icon)
        assignIfExists(ench, "Modifiers", result.Modifiers)
        return ench
    end
    return { Id = enchantId, Name = "Unknown Enchant" }
end

-- === Inventory Resolver ===
local function resolveInventory()
    local inv = data:Get("Inventory") or {}
    local resolved = {}

    for category, items in pairs(inv) do
        for _, entry in pairs(items) do
            if type(entry) == "table" and entry.Id then
                local def = resolveItem(category, entry.Id)
                local defData = def.Data or {}
                local itemType = defData.Type or category

                local combined = {
                    UUID = entry.UUID,
                    Id = entry.Id,
                    Type = itemType,
                    Quantity = entry.Quantity or 1,
                    Favorited = entry.Favorited or false,
                    Metadata = normalizeMetadata(entry.Metadata),
                    Name = defData.Name,
                    Tier = defData.Tier,
                    Description = defData.Description,
                    Icon = defData.Icon
                }

                if entry.Metadata and entry.Metadata.EnchantId then
                    combined.Enchant = resolveEnchant(entry.Metadata.EnchantId)
                end

                -- Extra fields by type
                if itemType == "Fishes" then
                    assignIfExists(combined, "SellPrice", def.SellPrice)
                    assignIfExists(combined, "Probability", def.Probability)
                    assignIfExists(combined, "Rarity", def.Rarity)
                    assignIfExists(combined, "LengthRange", def.LengthRange)
                    assignIfExists(combined, "WeightRange", def.WeightRange)
                    assignIfExists(combined, "ShinyChance", def.ShinyChance)
                    assignIfExists(combined, "AreaName", def.AreaName)
                    assignIfExists(combined, "EventExclusive", def.EventExclusive)
                    assignIfExists(combined, "Hidden", def.Hidden)
                    assignIfExists(combined, "BossOnly", def.BossOnly)
                elseif itemType == "Fishing Rods" then
                    assignIfExists(combined, "ClickPower", def.ClickPower)
                    assignIfExists(combined, "MaxWeight", def.MaxWeight)
                    assignIfExists(combined, "Resilience", def.Resilience)
                    assignIfExists(combined, "RollData", def.RollData)
                    assignIfExists(combined, "SpecialAbility", def.SpecialAbility)
                    assignIfExists(combined, "Durability", def.Durability)
                elseif itemType == "Baits" then
                    assignIfExists(combined, "Duration", def.Duration)
                    assignIfExists(combined, "ExtraChance", def.ExtraChance)
                    assignIfExists(combined, "LuckBoost", def.LuckBoost)
                    assignIfExists(combined, "Modifiers", def.Modifiers)
                elseif itemType == "Potions" then
                    assignIfExists(combined, "Effect", def.Effect)
                    assignIfExists(combined, "Duration", def.Duration)
                    assignIfExists(combined, "Magnitude", def.Magnitude)
                elseif itemType == "Boats" then
                    assignIfExists(combined, "Speed", def.Speed)
                    assignIfExists(combined, "Capacity", def.Capacity)
                    assignIfExists(combined, "Durability", def.Durability)
                elseif itemType == "EnchantStones" then
                    assignIfExists(combined, "SellPrice", def.SellPrice)
                    assignIfExists(combined, "Probability", def.Probability)
                end

                if not resolved[itemType] then
                    resolved[itemType] = {}
                end
                table.insert(resolved[itemType], combined)
            end
        end
    end
    return resolved
end

-- === Equipped Resolver ===
local function resolveEquipped(inventory)
    local equipped = {}

    -- Rod
    local equippedUUIDs = data:Get("EquippedItems") or {}
    for _, uuid in pairs(equippedUUIDs) do
        for _, items in pairs(inventory) do
            for _, entry in pairs(items) do
                if entry.UUID == uuid and entry.Type == "Fishing Rods" then
                    equipped.Rod = {
                        UUID = entry.UUID,
                        Id = entry.Id,
                        Name = entry.Name,
                        Tier = entry.Tier
                    }
                end
            end
        end
    end

    -- Bait
    local baitId = data:Get("EquippedBaitId")
    if baitId then
        local baitDef = resolveItem("Baits", baitId)
        local baitData = baitDef.Data or {}
        equipped.Bait = {
            Id = baitId,
            Name = baitData.Name,
            Tier = baitData.Tier,
            Icon = baitData.Icon
        }
        assignIfExists(equipped.Bait, "Modifiers", baitDef.Modifiers)
    end

    -- Skin
    local skinUUID = data:Get("EquippedSkinUUID")
    if skinUUID then
        for _, entry in pairs(inventory["Fishing Rods"] or {}) do
            if entry.UUID == skinUUID then
                equipped.Skin = {
                    UUID = skinUUID,
                    Name = entry.Name,
                    Icon = entry.Icon
                }
                break
            end
        end
    end

    -- Potions
    local equippedPotions = data:Get("EquippedPotions") or {}
    if equippedPotions then
        equipped.Potions = {}
        for slot, potion in pairs(equippedPotions) do
            if potion.Id then
                local potionDef = resolveItem("Potions", potion.Id)
                local potionData = potionDef.Data or {}
                local potionOut = {
                    Slot = slot,
                    Id = potion.Id,
                    Name = potionData.Name,
                    Tier = potionData.Tier,
                    Icon = potionData.Icon,
                    Quantity = potion.Quantity or 1,
                    Expires = potion.Expires
                }
                assignIfExists(potionOut, "Effect", potionDef.Effect)
                assignIfExists(potionOut, "Duration", potionDef.Duration)
                assignIfExists(potionOut, "Magnitude", potionDef.Magnitude)
                table.insert(equipped.Potions, potionOut)
            end
        end
    end

    return equipped
end

-- === Player Info ===
local function resolvePlayerInfo(inventory)
    return {
        UserId = LocalPlayer.UserId,
        Username = LocalPlayer.Name,
        Level = data:Get("Level"),
        XP = data:Get("XP"),
        Coins = data:Get("Coins"),
        FirstJoinDate = data:Get("FirstJoinDate"),
        LastJoinDate = data:Get("LastJoinDate"),
        LastLogin = data:Get("LastLogin"),
        TotalSessionTime = data:Get("TotalSessionTime"),
        LoginStreak = data:Get("LoginStreak"),
        Modifiers = data:Get("Modifiers"),
        Statistics = data:Get("Statistics"),
        Equipped = resolveEquipped(inventory)
    }
end

-- === Build final ===
local inventory = resolveInventory()
local combined = {
    SchemaVersion = 1,
    Player = resolvePlayerInfo(inventory),
    Inventory = inventory
}

-- === Send to server ===
local API_URL = "https://redcodes.my.id/api/gamedata"
local SEND_INTERVAL = 30

local httpRequest = (syn and syn.request) or (http and http.request) or http_request or request

local function sendData()
    if not httpRequest then
        warn("[RedCode] No HTTP request function available")
        return
    end
    
    local payload = {
        username = LocalPlayer.Name,
        data = combined
    }
    
    local jsonData = HttpService:JSONEncode(payload)
    
    local success, response = pcall(function()
        return httpRequest({
            Url = API_URL,
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json"
            },
            Body = jsonData
        })
    end)
    
    if success then
        if type(response) == "table" then
            if response.Success or (response.StatusCode and response.StatusCode >= 200 and response.StatusCode < 300) then
                print("[RedCode] Data sent successfully")
            else
                warn("[RedCode] Failed to send data: HTTP", response.StatusCode or "unknown", response.StatusMessage or "")
            end
        else
            print("[RedCode] Data sent")
        end
    else
        warn("[RedCode] Request error:", tostring(response))
    end
end

sendData()

while true do
    task.wait(SEND_INTERVAL)
    
    inventory = resolveInventory()
    combined = {
        SchemaVersion = 1,
        Player = resolvePlayerInfo(inventory),
        Inventory = inventory
    }
    
    sendData()
end