const http = require('http');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const PORT = 80;
const DB_PATH = path.join(__dirname, 'database.json');
const BOT_TIMEOUT = 120000; // 2 minutes in milliseconds
const JWT_SECRET = 'ROBLOXGGIN2025DAWG';

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function readDB() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { users: [], bots: [] };
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Check bot status every 30 seconds
function checkBotStatus() {
    const db = readDB();
    const now = Date.now();
    let updated = false;

    db.bots.forEach(bot => {
        if (bot.lastUpdate) {
            const lastUpdate = new Date(bot.lastUpdate).getTime();
            const timeDiff = now - lastUpdate;
            if (timeDiff > BOT_TIMEOUT && bot.status === 'online') {
                console.log(`[${new Date().toISOString()}] Bot ${bot.name} timed out (${Math.round(timeDiff/1000)}s > ${BOT_TIMEOUT/1000}s), setting to offline`);
                bot.status = 'offline';
                updated = true;
            }
        }
    });

    if (updated) {
        writeDB(db);
    }
}

// Run status check every 30 seconds
setInterval(checkBotStatus, 30000);

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', reject);
    });
}

function sendJSON(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// JWT Verification Middleware
function verifyJWT(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return sendJSON(res, { error: 'JWT token required' }, 401);
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return sendJSON(res, { error: 'Invalid JWT token' }, 401);
        }
        req.user = decoded;
        next();
    });
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // Script endpoint - only accessible by Roblox executors
    if (pathname === '/api/script' && req.method === 'GET') {
        const userAgent = req.headers['user-agent'] || '';
        const robloxExecutors = ['syn', 'synapse', 'krnl', 'script-ware', 'fluxus', 'oxygen', 'sentinel', 'sirhurt', 'electron', 'coco', 'comet', 'trigon', 'delta', 'hydrogen', 'arceus', 'evon', 'jjsploit', 'roblox'];
        
        // Check if request is from a Roblox executor
        const isRobloxExecutor = robloxExecutors.some(exec => 
            userAgent.toLowerCase().includes(exec)
        );
        
        // Also check for Roblox-specific headers
        const hasRobloxHeader = req.headers['roblox-id'] || 
                                req.headers['roblox-game'] || 
                                userAgent.toLowerCase().includes('roblox') ||
                                userAgent === '' ||
                                userAgent.toLowerCase().includes('http.request');
        
        if (!isRobloxExecutor && !hasRobloxHeader) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            return res.end('Access Denied');
        }
        
        // Read and serve sc.lua
        const scriptPath = path.join(__dirname, 'sc.lua');
        try {
            const scriptContent = fs.readFileSync(scriptPath, 'utf8');
            res.writeHead(200, { 
                'Content-Type': 'text/plain',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            return res.end(scriptContent);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            return res.end('Script not found');
        }
    }

    // API Routes
    if (pathname.startsWith('/api/')) {
        const db = readDB();

        // Register
        if (pathname === '/api/register' && req.method === 'POST') {
            const body = await parseBody(req);
            const { username, password } = body;

            if (db.users.find(u => u.username === username)) {
                return sendJSON(res, { error: 'Username already exists' }, 400);
            }

            const newUser = {
                id: Date.now(),
                username,
                password,
                apiKey: 'ts_' + Math.random().toString(36).substr(2, 32),
                createdAt: new Date().toISOString()
            };

            db.users.push(newUser);
            writeDB(db);
            return sendJSON(res, { success: true, user: { id: newUser.id, username: newUser.username } });
        }

        // Login
        if (pathname === '/api/login' && req.method === 'POST') {
            const body = await parseBody(req);
            const { username, password } = body;

            const user = db.users.find(u => u.username === username && u.password === password);
            if (!user) {
                return sendJSON(res, { error: 'Invalid username or password' }, 401);
            }

            return sendJSON(res, { 
                success: true, 
                user: { id: user.id, username: user.username, apiKey: user.apiKey } 
            });
        }

        // Get user bots
        if (pathname === '/api/bots' && req.method === 'GET') {
            const userId = parseInt(url.searchParams.get('userId'));
            const userBots = db.bots.filter(b => b.userId === userId);
            
            console.log(`[${new Date().toISOString()}] GET /api/bots - userId: ${userId}, found ${userBots.length} bots`);
            userBots.forEach(bot => {
                console.log(`[${new Date().toISOString()}] Bot: ${bot.name}, status: ${bot.status}, lastUpdate: ${bot.lastUpdate || 'never'}`);
            });
            
            return sendJSON(res, { bots: userBots });
        }

        // Add bot
        if (pathname === '/api/bots' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId, name, token, gameId } = body;

            const newBot = {
                id: Date.now(),
                userId,
                name: name || 'NewBot',
                status: 'offline',
                coin: 0,
                fishCaught: 0,
                rarestFish: 'None',
                rarity: 'common',
                backpackCurrent: 0,
                backpackMax: 100,
                token: token || '',
                gameId: gameId || ''
            };

            db.bots.push(newBot);
            writeDB(db);
            return sendJSON(res, { success: true, bot: newBot });
        }

        // Delete bot
        if (pathname.startsWith('/api/bots/') && req.method === 'DELETE') {
            const botId = parseInt(pathname.split('/').pop());
            const botIndex = db.bots.findIndex(b => b.id === botId);

            if (botIndex === -1) {
                return sendJSON(res, { error: 'Bot not found' }, 404);
            }

            db.bots.splice(botIndex, 1);
            writeDB(db);
            return sendJSON(res, { success: true });
        }

        // Update user settings
        if (pathname === '/api/user/settings' && req.method === 'PUT') {
            const body = await parseBody(req);
            const { userId, username } = body;

            const userIndex = db.users.findIndex(u => u.id === userId);
            if (userIndex === -1) {
                return sendJSON(res, { error: 'User not found' }, 404);
            }

            db.users[userIndex].username = username;
            writeDB(db);
            return sendJSON(res, { success: true, user: db.users[userIndex] });
        }

        // Regenerate API key
        if (pathname === '/api/user/apikey' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId } = body;

            const userIndex = db.users.findIndex(u => u.id === userId);
            if (userIndex === -1) {
                return sendJSON(res, { error: 'User not found' }, 404);
            }

            db.users[userIndex].apiKey = 'ts_' + Math.random().toString(36).substr(2, 32);
            writeDB(db);
            return sendJSON(res, { success: true, apiKey: db.users[userIndex].apiKey });
        }

        // Verify user session
        if (pathname === '/api/verify' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId } = body;

            const user = db.users.find(u => u.id === userId);
            if (!user) {
                return sendJSON(res, { valid: false }, 401);
            }

            return sendJSON(res, { 
                valid: true, 
                user: { id: user.id, username: user.username, apiKey: user.apiKey } 
            });
        }

        // Public stats for landing page
        if (pathname === '/api/stats' && req.method === 'GET') {
            const totalUsers = db.users.length;
            const totalBots = db.bots.length;
            const totalCoins = db.bots.reduce((sum, b) => sum + (b.coin || 0), 0);
            const totalFish = db.bots.reduce((sum, b) => sum + (b.fishCaught || 0), 0);

            return sendJSON(res, {
                totalUsers,
                totalBots,
                totalCoins,
                totalFish
            });
        }

        // JWT Token Generation
        if (pathname === '/api/auth/token' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId } = body;

            if (!userId) {
                return sendJSON(res, { error: 'User ID required' }, 400);
            }

            // Verify user exists
            const user = db.users.find(u => u.id === parseInt(userId));
            if (!user) {
                return sendJSON(res, { error: 'User not found' }, 404);
            }

            // Generate JWT token using exact format
            const token = jwt.sign(
                { role: "user" }, // payload bebas, sesuaikan backend
                JWT_SECRET,
                { expiresIn: "1h" }
            );

            return sendJSON(res, { 
                success: true, 
                token,
                user: { id: user.id, username: user.username }
            });
        }

        // Receive game data from Roblox
        if (pathname === '/api/gamedata' && req.method === 'POST') {
            const body = await parseBody(req);
            const { username, data: gameData } = body;

            if (!username || !gameData) {
                return sendJSON(res, { error: 'Missing username or data' }, 400);
            }

            // Find all bots by username (case-insensitive) and update them all
            const botIndices = [];
            db.bots.forEach((bot, index) => {
                if (bot.name.toLowerCase() === username.toLowerCase()) {
                    botIndices.push(index);
                }
            });
            
            if (botIndices.length === 0) {
                return sendJSON(res, { error: 'Bot not found in database' }, 404);
            }

            // Update all matching bots
            let updatedBots = [];
            for (const index of botIndices) {
                const bot = db.bots[index];
                const player = gameData.Player || {};
                const inventory = gameData.Inventory || {};

                // Update bot data
                bot.status = 'online';
                bot.coin = player.Coins || bot.coin || 0;
                bot.level = player.Level || 0;
                bot.xp = player.XP || 0;
                
                // Calculate fish caught from inventory
                let totalFish = 0;
                if (inventory.Fishes) {
                    for (const fish of inventory.Fishes) {
                        totalFish += fish.Quantity || 1;
                    }
                }
                bot.fishCaught = totalFish;

                // Find rarest fish
                const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'secret'];
                let rarestFish = 'None';
                let highestRarity = -1;
                
                if (inventory.Fishes) {
                    for (const fish of inventory.Fishes) {
                        let rarityName = 'common';
                        
                        // Handle both Rarity (string) and Tier (number) fields
                        if (fish.Rarity) {
                            rarityName = (fish.Rarity || 'common').toLowerCase();
                        } else if (fish.Tier) {
                            // Convert Tier number to rarity name
                            const tierMap = {
                                1: 'common',
                                2: 'uncommon', 
                                3: 'rare',
                                4: 'epic',
                                5: 'legendary',
                                6: 'mythic',
                                7: 'secret'
                            };
                            rarityName = tierMap[fish.Tier] || 'common';
                        }
                        
                        const rarityIndex = rarityOrder.indexOf(rarityName);
                        if (rarityIndex > highestRarity) {
                            highestRarity = rarityIndex;
                            rarestFish = fish.Name || 'Unknown';
                            bot.rarity = rarityOrder[rarityIndex] || 'common';
                        }
                    }
                }
                bot.rarestFish = rarestFish;

                // Update backpack items from inventory
                bot.backpackItems = [];
                let backpackTotal = 0;
                
                // Helper function to fetch imageUrl from external API
                async function fetchImageUrl(assetId) {
                    try {
                        const token = jwt.sign(
                            { role: "user" },
                            JWT_SECRET,
                            { expiresIn: "1h" }
                        );
                        const response = await axios.get(
                            `https://apiweb.wintercode.dev/api/thumbnail?assetId=${assetId}`,
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        return response.data.imageUrl || response.data.url || null;
                    } catch (err) {
                        console.error(`Failed to fetch imageUrl for assetId ${assetId}:`, err.message);
                        return null;
                    }
                }
                
                for (const [category, items] of Object.entries(inventory)) {
                    if (Array.isArray(items)) {
                        for (const item of items) {
                            const quantity = item.Quantity || 1;
                            backpackTotal += quantity;
                            
                            let rarityValue = 'common';
                            if (item.Rarity) {
                                rarityValue = typeof item.Rarity === 'string' ? item.Rarity.toLowerCase() : 'common';
                            } else if (item.Tier) {
                                const tierMap = {
                                    1: 'common',
                                    2: 'uncommon', 
                                    3: 'rare',
                                    4: 'epic',
                                    5: 'legendary',
                                    6: 'mythic',
                                    7: 'secret'
                                };
                                rarityValue = tierMap[item.Tier] || 'common';
                            }
                            
                            // Extract asset ID from Icon field (rbxassetid://ASSET_ID)
                            let assetId = null;
                            if (item.Icon && item.Icon.includes('rbxassetid://')) {
                                assetId = item.Icon.replace('rbxassetid://', '');
                            } else if (item.Id) {
                                assetId = item.Id.toString();
                            } else if (item.UUID) {
                                assetId = item.UUID;
                            }
                            
                            // Fetch imageUrl from external API
                            let imageUrl = null;
                            if (assetId) {
                                imageUrl = await fetchImageUrl(assetId);
                            }
                            
                            bot.backpackItems.push({
                                name: item.Name || 'Unknown',
                                rarity: rarityValue,
                                count: quantity,
                                type: item.Type || category,
                                id: assetId,
                                uuid: item.UUID,
                                icon: imageUrl || item.Icon
                            });
                        }
                    }
                }
                bot.backpackCurrent = backpackTotal;

                // Store equipped items
                if (player.Equipped) {
                    bot.equipped = player.Equipped;
                }

                // Store statistics
                if (player.Statistics) {
                    bot.statistics = player.Statistics;
                }

                // Store quests
                if (gameData.Quests) {
                    bot.quests = gameData.Quests;
                }

                // Store modifiers
                if (player.Modifiers) {
                    bot.modifiers = player.Modifiers;
                }

                // Store player info (preserve existing userId if it exists)
                if (bot.userId) {
                    // Keep existing userId
                } else {
                    bot.userId = player.UserId;
                }
                bot.level = player.Level;
                bot.xp = player.XP;
                bot.loginStreak = player.LoginStreak;
                bot.totalSessionTime = player.TotalSessionTime;
                bot.lastUpdate = new Date().toISOString();

                db.bots[index] = bot;
                updatedBots.push(bot);
            }

            writeDB(db);

            return sendJSON(res, { 
                success: true, 
                message: `Data updated successfully for ${updatedBots.length} bot(s)`,
                bot: updatedBots.length > 0 ? {
                    name: updatedBots[0].name,
                    status: updatedBots[0].status,
                    coin: updatedBots[0].coin,
                    fishCaught: updatedBots[0].fishCaught,
                    backpackCurrent: updatedBots[0].backpackCurrent
                } : null
            });
        }

        // Thumbnail proxy endpoint (no auth required - server generates JWT for external API)
        if (pathname === '/api/thumbnail' && req.method === 'GET') {
            const assetId = url.searchParams.get('assetId');
            if (!assetId) {
                return sendJSON(res, { error: 'Asset ID required' }, 400);
            }

            try {
                // Generate JWT token for external API
                const token = jwt.sign(
                    { role: "user" },
                    JWT_SECRET,
                    { expiresIn: "1h" }
                );

                // Fetch thumbnail URL from external API
                const apiResponse = await axios.get(
                    `https://apiweb.wintercode.dev/api/thumbnail?assetId=${assetId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                // Get the thumbnail URL from response
                const thumbnailUrl = apiResponse.data.imageUrl || apiResponse.data.url || apiResponse.data;
                
                // Fetch the actual image
                const imageResponse = await axios.get(thumbnailUrl, { responseType: 'arraybuffer' });
                
                res.writeHead(200, { 
                    'Content-Type': 'image/png',
                    'Cache-Control': 'public, max-age=3600'
                });
                res.end(Buffer.from(imageResponse.data));

            } catch (err) {
                console.error('Thumbnail fetch error:', err.response?.data || err.message);
                sendJSON(res, { error: 'Failed to fetch thumbnail' }, 500);
            }
            return;
        }

        return sendJSON(res, { error: 'Not found' }, 404);
    }

    // Static files
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`RedCode server running at http://localhost:${PORT}`);
});
