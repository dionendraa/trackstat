// Page Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// Dashboard Section Navigation
function showDashboardSection(sectionId, element) {
    document.querySelectorAll('.dashboard-content').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
    if (element) {
        element.classList.add('active');
    }
    
    const titles = {
        'dashboard-section': 'Dashboard',
        'bot-section': 'Bot Management',
        'backpack-section': 'Backpack',
        'setting-section': 'Settings'
    };
    document.getElementById('section-title').textContent = titles[sectionId] || 'Dashboard';

    // Save current section to localStorage
    localStorage.setItem('redcode_current_section', sectionId);

    if (sectionId === 'bot-section') {
        loadBots();
    }
    if (sectionId === 'dashboard-section') {
        loadDashboardStats();
    }
    if (sectionId === 'backpack-section') {
        loadBackpack();
    }
}

// User data storage
let currentUser = null;
let jwtToken = null;

// API Helper
async function api(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    // Add JWT token for protected endpoints
    if (jwtToken && endpoint.includes('/thumbnail')) {
        options.headers['Authorization'] = `Bearer ${jwtToken}`;
    }
    const response = await fetch(`/api${endpoint}`, options);
    return response.json();
}

// Get JWT token for user
async function getJWTToken() {
    if (!currentUser) return null;
    
    try {
        const result = await api('/auth/token', 'POST', { userId: currentUser.id });
        if (result.success) {
            jwtToken = result.token;
            return jwtToken;
        }
    } catch (error) {
        console.error('Failed to get JWT token:', error);
    }
    return null;
}

// Login Handler
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    const result = await api('/login', 'POST', { username, password });
    
    if (result.success) {
        currentUser = result.user;
        localStorage.setItem('redcode_current_user', JSON.stringify(currentUser));
        updateUserDisplay();
        showPage('dashboard-page');
        loadBots();
        loadDashboardStats();
        startAutoUpdate();
        
        // Get JWT token for image access
        await getJWTToken();
        
        showNotification('Login successful!', 'success');
    } else {
        showNotification(result.error || 'Invalid username or password', 'error');
    }
}

// Register Handler
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('register-name').value;
    const password = document.getElementById('register-password').value;
    
    const result = await api('/register', 'POST', { username, password });
    
    if (result.success) {
        showNotification('Account created successfully!', 'success');
        showPage('login-page');
    } else {
        showNotification(result.error || 'Registration failed', 'error');
    }
}

// Logout Handler
function handleLogout() {
    stopAutoUpdate();
    currentUser = null;
    localStorage.removeItem('redcode_current_user');
    showPage('landing-page');
    showNotification('Logged out successfully', 'success');
}

// Update User Display
function updateUserDisplay() {
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.username;
        document.querySelector('.avatar').textContent = currentUser.username.charAt(0).toUpperCase();
        document.getElementById('setting-username').value = currentUser.username;
        if (currentUser.apiKey) {
            document.getElementById('api-key').value = currentUser.apiKey;
        }
    }
}

// Load Bots from API
async function loadBots() {
    if (!currentUser) return;

    console.log(`[Frontend] Loading bots for userId: ${currentUser.id}`);
    const result = await api(`/bots?userId=${currentUser.id}`);
    const bots = result.bots || [];
    
    console.log(`[Frontend] Received ${bots.length} bots:`, bots.map(b => ({name: b.name, status: b.status})));
    
    const tbody = document.getElementById('bot-table-body');
    tbody.innerHTML = '';

    // Update bot stats counters
    updateBotStatsCounters(bots);

    if (bots.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    No bots found. Click "Add Bot" to add your first bot.
                </td>
            </tr>
        `;
        return;
    }

    bots.forEach((bot, index) => {
        const backpackPercent = (bot.backpackCurrent / bot.backpackMax) * 100;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><span class="status-badge ${bot.status}">${bot.status.charAt(0).toUpperCase() + bot.status.slice(1)}</span></td>
            <td>${bot.name}</td>
            <td>${bot.coin.toLocaleString()}</td>
            <td>${bot.fishCaught.toLocaleString()}</td>
            <td><span class="rarity ${bot.rarity}">${bot.rarestFish}</span></td>
            <td>
                <div class="backpack-bar">
                    <div class="backpack-fill" style="width: ${backpackPercent}%"></div>
                    <span>${bot.backpackCurrent}/${bot.backpackMax}</span>
                </div>
            </td>
            <td>
                <button class="btn-icon btn-remove" onclick="removeBot(${bot.id})" title="Remove Bot">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update bot stats counters (online/total, secret, mythic)
function updateBotStatsCounters(bots) {
    const totalBots = bots.length;
    const onlineBots = bots.filter(b => b.status === 'online').length;
    
    // Count secret and mythic from all backpack items
    let secretCount = 0;
    let mythicCount = 0;
    
    bots.forEach(bot => {
        if (bot.backpackItems && bot.backpackItems.length > 0) {
            bot.backpackItems.forEach(item => {
                const rarity = (item.rarity || '').toLowerCase();
                if (rarity === 'secret') secretCount += (item.count || 1);
                if (rarity === 'mythic') mythicCount += (item.count || 1);
            });
        }
    });
    
    // Update DOM
    const onlineCountEl = document.getElementById('bot-online-count');
    const totalCountEl = document.getElementById('bot-total-count');
    const secretCountEl = document.getElementById('bot-secret-count');
    const mythicCountEl = document.getElementById('bot-mythic-count');
    
    if (onlineCountEl) onlineCountEl.textContent = onlineBots;
    if (totalCountEl) totalCountEl.textContent = totalBots;
    if (secretCountEl) secretCountEl.textContent = secretCount;
    if (mythicCountEl) mythicCountEl.textContent = mythicCount;
}

// Dashboard Stats and Chart
let botChart = null;
let chartHistory = [];

async function loadDashboardStats() {
    if (!currentUser) return;

    const result = await api(`/bots?userId=${currentUser.id}`);
    const bots = result.bots || [];
    
    // Calculate stats
    const totalBots = bots.length;
    const onlineBots = bots.filter(b => b.status === 'online').length;
    const offlineBots = bots.filter(b => b.status === 'offline' || b.status === 'idle').length;
    
    // Update stat cards
    document.getElementById('stat-total-bots').textContent = totalBots;
    document.getElementById('stat-online-bots').textContent = onlineBots;
    document.getElementById('stat-offline-bots').textContent = offlineBots;
    
    // Update chart
    updateBotChart(bots);
    
    // Update summary table
    updateBotSummary(bots);
    
    // Update time
    const now = new Date();
    document.getElementById('chart-update-time').textContent = 
        `Last updated: ${now.toLocaleTimeString()}`;
}

function updateBotChart(bots) {
    const canvas = document.getElementById('bot-stats-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Store history for chart (max 10 points)
    const totalCoins = bots.reduce((sum, b) => sum + b.coin, 0);
    const totalFish = bots.reduce((sum, b) => sum + b.fishCaught, 0);
    const timestamp = new Date().toLocaleTimeString();
    
    chartHistory.push({ timestamp, coins: totalCoins, fish: totalFish });
    if (chartHistory.length > 10) {
        chartHistory.shift();
    }

    // Simple bar chart rendering
    const chartContainer = canvas.parentElement;
    const width = chartContainer.offsetWidth;
    const height = 300;
    
    canvas.width = width;
    canvas.height = height;
    
    ctx.clearRect(0, 0, width, height);
    
    if (bots.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('No bot data available', width / 2, height / 2);
        return;
    }

    const padding = 60;
    const barWidth = Math.min(60, (width - padding * 2) / bots.length - 20);
    const maxValue = Math.max(...bots.map(b => b.coin), 1000);
    
    // Draw background grid
    ctx.strokeStyle = '#1e4976';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (height - padding * 2) * (i / 5);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        // Y-axis labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Segoe UI';
        ctx.textAlign = 'right';
        const value = Math.round(maxValue * (1 - i / 5));
        ctx.fillText(value.toLocaleString(), padding - 10, y + 4);
    }

    // Draw bars
    bots.forEach((bot, index) => {
        const x = padding + index * (barWidth + 20) + 10;
        const barHeight = (bot.coin / maxValue) * (height - padding * 2);
        const y = height - padding - barHeight;
        
        // Gradient bar
        const gradient = ctx.createLinearGradient(x, y, x, height - padding);
        gradient.addColorStop(0, '#60a5fa');
        gradient.addColorStop(1, '#3b82f6');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();
        
        // Bot name label
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Segoe UI';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x + barWidth / 2, height - padding + 15);
        ctx.fillText(bot.name.substring(0, 10), 0, 0);
        ctx.restore();
        
        // Value on top
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(bot.coin.toLocaleString(), x + barWidth / 2, y - 8);
    });
    
    // Chart title
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Segoe UI';
    ctx.textAlign = 'left';
    ctx.fillText('Coins per Bot', padding, 25);
}

function updateBotSummary(bots) {
    const tbody = document.getElementById('dashboard-bot-summary');
    if (!tbody) return;

    if (bots.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted);">No bots found</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    bots.forEach(bot => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${bot.name}</td>
            <td><span class="status-badge ${bot.status}">${bot.status.charAt(0).toUpperCase() + bot.status.slice(1)}</span></td>
            <td>${bot.coin.toLocaleString()}</td>
            <td>${bot.fishCaught.toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
}

// Save Settings
async function saveSettings() {
    if (!currentUser) return;
    
    const username = document.getElementById('setting-username').value;
    
    const result = await api('/user/settings', 'PUT', { 
        userId: currentUser.id, 
        username 
    });

    if (result.success) {
        currentUser.username = username;
        localStorage.setItem('redcode_current_user', JSON.stringify(currentUser));
        updateUserDisplay();
        showNotification('Settings saved!', 'success');
    } else {
        showNotification(result.error || 'Failed to save settings', 'error');
    }
}

// API Key Functions
function toggleApiKey() {
    const input = document.getElementById('api-key');
    const btn = input.nextElementSibling;
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Hide';
    } else {
        input.type = 'password';
        btn.textContent = 'Show';
    }
}

async function regenerateApiKey() {
    if (!currentUser) return;
    
    if (confirm('Are you sure you want to regenerate your API key? This will invalidate your current key.')) {
        const result = await api('/user/apikey', 'POST', { userId: currentUser.id });
        
        if (result.success) {
            currentUser.apiKey = result.apiKey;
            localStorage.setItem('redcode_current_user', JSON.stringify(currentUser));
            document.getElementById('api-key').value = result.apiKey;
            showNotification('API key regenerated!', 'success');
        } else {
            showNotification(result.error || 'Failed to regenerate API key', 'error');
        }
    }
}

// Bot Modal
function showAddBotModal() {
    document.getElementById('add-bot-modal').classList.add('active');
}

function closeAddBotModal() {
    document.getElementById('add-bot-modal').classList.remove('active');
}

async function handleAddBot(event) {
    event.preventDefault();
    
    if (!currentUser) return;

    const username = document.getElementById('add-bot-username').value.trim();

    // Check for duplicate bot name
    const existingBots = await api(`/bots?userId=${currentUser.id}`);
    const bots = existingBots.bots || [];
    const isDuplicate = bots.some(bot => bot.name.toLowerCase() === username.toLowerCase());
    
    if (isDuplicate) {
        showNotification('Bot with this name already exists!', 'error');
        return;
    }

    const result = await api('/bots', 'POST', {
        userId: currentUser.id,
        name: username
    });

    if (result.success) {
        showNotification('Bot added successfully!', 'success');
        closeAddBotModal();
        document.getElementById('add-bot-username').value = '';
        loadBots();
    } else {
        showNotification(result.error || 'Failed to add bot', 'error');
    }
}

// Remove Bot
async function removeBot(botId) {
    if (confirm('Are you sure you want to remove this bot?')) {
        const result = await api(`/bots/${botId}`, 'DELETE');
        
        if (result.success) {
            showNotification('Bot removed successfully!', 'success');
            loadBots();
        } else {
            showNotification(result.error || 'Failed to remove bot', 'error');
        }
    }
}

// Backpack Functions
let allBackpackItems = [];

async function loadBackpack() {
    if (!currentUser) return;

    const result = await api(`/bots?userId=${currentUser.id}`);
    const bots = result.bots || [];

    // Collect all backpack items from all bots
    allBackpackItems = [];
    bots.forEach(bot => {
        if (bot.backpackItems && bot.backpackItems.length > 0) {
            bot.backpackItems.forEach(item => {
                allBackpackItems.push({
                    ...item,
                    botId: bot.id,
                    botName: bot.name
                });
            });
        }
    });

    renderBackpackItems(allBackpackItems);
}

function renderBackpackItems(items) {
    const grid = document.getElementById('backpack-grid');
    const totalEl = document.getElementById('backpack-total-items');
    
    if (!grid) return;

    // Get category from active button
    const activeCategoryBtn = document.querySelector('.category-btn.active');
    const categoryFilter = activeCategoryBtn ? activeCategoryBtn.dataset.category : 'fish';

    let filteredItems = items;

    // Filter by category (always filter since no "all" option)
    if (categoryFilter) {
        filteredItems = filteredItems.filter(item => {
            const itemType = item.type ? item.type.toLowerCase() : 'item';
            return itemType === categoryFilter.toLowerCase();
        });
    }

    totalEl.textContent = `Total Items: ${filteredItems.length}`;

    if (filteredItems.length === 0) {
        grid.innerHTML = `
            <div class="backpack-empty">
                <p>No items found with current filters</p>
            </div>
        `;
        return;
    }

    // Get image based on item type and asset ID
    function getItemImage(item) {
        const itemType = (item.type || 'item').toLowerCase();
        
        // If item has an icon field with rbxassetid://, extract and use the thumbnail API
        if (item.icon && item.icon.includes('rbxassetid://')) {
            const assetId = item.icon.replace('rbxassetid://', '');
            return `/api/thumbnail?assetId=${assetId}`;
        }
        // If item has an asset ID, use the thumbnail API
        else if (item.id || item.uuid) {
            const assetId = item.id || item.uuid;
            return `/api/thumbnail?assetId=${assetId}`;
        }
        
        // Fallback to category-based icons
        switch(itemType) {
            case 'fish':
                return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS41Ij48cGF0aCBkPSJNMTYgOHM4LTQgOC00LTgtNC04LTgtNHpNMTYgOHM4LTQgOC00LTgtNC04LTgtNHpNOCAxNnMtOCA0LTggNCA4IDQgOCA0IDggNCA4IDR6Ii8+PC9zdmc+';
            case 'bait':
                return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS41Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxwYXRoIGQ9Ik0xMiA4djhNOCAxMmg4Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIvPjwvc3ZnPg==';
            case 'rod':
                return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS41Ij48cGF0aCBkPSJNMiAyMWw4LThNMTIgMmw0IDQtNCA0LTQtNHpNMTYgNmwxIDhNOCAxMmw0IDQiLz48L3N2Zz4=';
            default:
                return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS41Ij48cGF0aCBkPSJNMTIgMkwyIDdsMTAgNSAxMC01LTEwLTVaTTIgMTdsMTAgNSAxMC01TTIgMTJsMTAgNSAxMC01Ii8+PC9zdmc+';
        }
    }

    grid.innerHTML = '';
    filteredItems.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = `backpack-item ${item.rarity}`;
        itemEl.innerHTML = `
            <div class="backpack-item-icon">
                <img src="${getItemImage(item)}" alt="${item.name}" 
                     onerror="this.style.display='none';"
                     loading="lazy">
            </div>
            <div class="backpack-item-name">${item.name}</div>
            <div class="backpack-item-rarity ${item.rarity}">${item.rarity}</div>
            <div class="backpack-item-count">x${item.count || 1}</div>
            <div class="backpack-item-type">${item.type || 'item'}</div>
            <div class="backpack-item-bot">${item.botName}</div>
        `;
        grid.appendChild(itemEl);
    });
}

function filterByCategory(category, button) {
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    // Trigger filter update
    filterBackpack();
}

function filterBackpack() {
    renderBackpackItems(allBackpackItems);
}

// Notification System
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 1rem;
        z-index: 2000;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(-20px);
        }
    }
`;
document.head.appendChild(style);

// Check for existing session on page load
document.addEventListener('DOMContentLoaded', async () => {
    const savedUser = localStorage.getItem('redcode_current_user');
    if (savedUser) {
        const userData = JSON.parse(savedUser);
        
        // Verify user still exists in database
        try {
            const verifyResult = await api('/verify', 'POST', { userId: userData.id });
            
            if (verifyResult && verifyResult.valid) {
                currentUser = verifyResult.user;
                localStorage.setItem('redcode_current_user', JSON.stringify(currentUser));
                updateUserDisplay();
                showPage('dashboard-page');
                
                // Restore last active section
                const savedSection = localStorage.getItem('redcode_current_section') || 'dashboard-section';
                const navItem = document.querySelector(`.nav-item[onclick*="${savedSection}"]`);
                showDashboardSection(savedSection, navItem);
                
                await loadBots();
                if (savedSection === 'dashboard-section') {
                    await loadDashboardStats();
                }
                startAutoUpdate();
            } else {
                // Invalid session, clear and show landing
                localStorage.removeItem('redcode_current_user');
                showPage('landing-page');
            }
        } catch (err) {
            // Server error, clear session and show landing
            localStorage.removeItem('redcode_current_user');
            showPage('landing-page');
        }
    } else {
        showPage('landing-page');
    }
});

// Auto Update - silent refresh every 15 seconds
let autoUpdateInterval = null;

function startAutoUpdate() {
    console.log('[Frontend] Starting auto-update interval (15 seconds)');
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
    }
    
    autoUpdateInterval = setInterval(async () => {
        if (!currentUser) {
            stopAutoUpdate();
            return;
        }
        
        console.log('[Frontend] Auto-update running...');
        // Silent update - no notifications
        try {
            const currentSection = document.querySelector('.dashboard-content.active');
            if (currentSection) {
                const sectionId = currentSection.id;
                
                if (sectionId === 'bot-section') {
                    await silentLoadBots();
                }
                
                if (sectionId === 'dashboard-section') {
                    await loadDashboardStats();
                }
                
                if (sectionId === 'backpack-section') {
                    await loadBackpack();
                }
            }
        } catch (err) {
            // Silent fail - don't show error
            console.log('Auto update failed silently');
        }
    }, 15000); // 15 seconds
}

function stopAutoUpdate() {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
    }
}

// Silent load bots (no UI feedback)
async function silentLoadBots() {
    if (!currentUser) return;

    console.log(`[Frontend] Silent loading bots for userId: ${currentUser.id}`);
    const result = await api(`/bots?userId=${currentUser.id}`);
    const bots = result.bots || [];
    
    console.log(`[Frontend] Silent update: ${bots.length} bots, statuses:`, bots.map(b => ({name: b.name, status: b.status})));
    
    // Update bot stats counters
    updateBotStatsCounters(bots);
    
    const tbody = document.getElementById('bot-table-body');
    if (!tbody) return;

    if (bots.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    No bots found. Click "Add Bot" to add your first bot.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    bots.forEach((bot, index) => {
        const backpackPercent = (bot.backpackCurrent / bot.backpackMax) * 100;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><span class="status-badge ${bot.status}">${bot.status.charAt(0).toUpperCase() + bot.status.slice(1)}</span></td>
            <td>${bot.name}</td>
            <td>${bot.coin.toLocaleString()}</td>
            <td>${bot.fishCaught.toLocaleString()}</td>
            <td><span class="rarity ${bot.rarity}">${bot.rarestFish}</span></td>
            <td>
                <div class="backpack-bar">
                    <div class="backpack-fill" style="width: ${backpackPercent}%"></div>
                    <span>${bot.backpackCurrent}/${bot.backpackMax}</span>
                </div>
            </td>
            <td>
                <button class="btn-icon btn-remove" onclick="removeBot(${bot.id})" title="Remove Bot">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Close modal on outside click
document.getElementById('add-bot-modal').addEventListener('click', (e) => {
    if (e.target.id === 'add-bot-modal') {
        closeAddBotModal();
    }
});

// Load landing page stats
async function loadLandingStats() {
    try {
        const result = await api('/stats');
        
        const totalUsersEl = document.getElementById('landing-total-users');
        const totalBotsEl = document.getElementById('landing-total-bots');
        const totalCoinsEl = document.getElementById('landing-total-coins');
        
        if (totalUsersEl) {
            totalUsersEl.textContent = formatNumber(result.totalUsers || 0);
        }
        if (totalBotsEl) {
            totalBotsEl.textContent = formatNumber(result.totalBots || 0);
        }
        if (totalCoinsEl) {
            totalCoinsEl.textContent = formatNumber(result.totalCoins || 0);
        }
    } catch (err) {
        console.log('Failed to load landing stats');
    }
}

// Format number with K, M suffix
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Load landing stats on page load
loadLandingStats();

// Auto refresh landing stats every 30 seconds
setInterval(() => {
    const landingPage = document.getElementById('landing-page');
    if (landingPage && landingPage.classList.contains('active')) {
        loadLandingStats();
    }
}, 30000);
