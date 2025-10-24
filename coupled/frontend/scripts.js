// ========== CONFIGURATION ==========
const WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@ticker";
let API_URL = "";
let API_KEY = "";

// ========== STATE ==========
let btcPrice = 0;
let positions = [];
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// ========== DOM ELEMENTS ==========
const elements = {
    // Modals
    configModal: document.getElementById("config-modal"),
    editModal: document.getElementById("edit-modal"),

    // Navigation
    connectionStatus: document.getElementById("connection-status"),

    // Ticker
    currentPrice: document.getElementById("current-price"),
    priceChange: document.getElementById("price-change"),
    high24h: document.getElementById("high-24h"),
    low24h: document.getElementById("low-24h"),
    volume24h: document.getElementById("volume-24h"),

    // Forms
    configForm: document.getElementById("config-form"),
    apiUrlInput: document.getElementById("api-url"),
    apiKeyInput: document.getElementById("api-key"),

    form: document.getElementById("position-form"),
    entryInput: document.getElementById("entry"),
    quantityInput: document.getElementById("quantity"),
    typeInput: document.getElementById("type"),

    // Edit Form
    editForm: document.getElementById("edit-form"),
    editIdInput: document.getElementById("edit-id"),
    editEntryInput: document.getElementById("edit-entry"),
    editQuantityInput: document.getElementById("edit-quantity"),
    editTypeInput: document.getElementById("edit-type"),

    // Table
    positionsBody: document.getElementById("positions-body"),
    positionsCount: document.getElementById("positions-count"),
    totalPnl: document.getElementById("total-pnl"),

    // Toast
    toastContainer: document.getElementById("toast-container"),
};

// ========== CONFIGURATION MANAGEMENT ==========
function loadConfig() {
    const savedConfig = localStorage.getItem("btc-tracker-config");
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        API_URL = config.apiUrl;
        API_KEY = config.apiKey || "";
        elements.configModal.style.display = "none";
        initializeApp();
    } else {
        elements.configModal.style.display = "flex";
    }
}

function saveConfig(apiUrl, apiKey) {
    const config = { apiUrl, apiKey };
    localStorage.setItem("btc-tracker-config", JSON.stringify(config));
    API_URL = apiUrl;
    API_KEY = apiKey || "";
}

elements.configForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const apiUrl = elements.apiUrlInput.value.trim();
    const apiKey = elements.apiKeyInput.value.trim();

    if (!apiUrl) {
        showToast("Please enter a valid API URL", "error");
        return;
    }

    saveConfig(apiUrl, apiKey);
    elements.configModal.style.display = "none";
    showToast("Configuration saved successfully! 🎉", "success");
    initializeApp();
});

window.openConfigModal = () => {
    const savedConfig = localStorage.getItem("btc-tracker-config");
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        elements.apiUrlInput.value = config.apiUrl;
        elements.apiKeyInput.value = config.apiKey || "";
    }
    elements.configModal.style.display = "flex";
};

window.closeConfigModal = () => {
    if (API_URL) {
        elements.configModal.style.display = "none";
    }
};

// ========== EDIT MODAL MANAGEMENT ==========
window.openEditModal = (position) => {
    elements.editIdInput.value = position.id;
    elements.editEntryInput.value = position.entry;
    elements.editQuantityInput.value = position.quantity;
    elements.editTypeInput.value = position.type;
    elements.editModal.style.display = "flex";
};

window.closeEditModal = () => {
    elements.editModal.style.display = "none";
    elements.editForm.reset();
};

elements.editForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = elements.editIdInput.value;
    const entry = parseFloat(elements.editEntryInput.value);
    const quantity = parseFloat(elements.editQuantityInput.value);
    const type = elements.editTypeInput.value;

    if (isNaN(entry) || entry <= 0) {
        showToast("Please enter a valid entry price", "error");
        return;
    }

    if (isNaN(quantity) || quantity <= 0) {
        showToast("Please enter a valid quantity", "error");
        return;
    }

    const position = positions.find(p => p.id === id);
    if (!position) {
        showToast("Position not found", "error");
        return;
    }

    const positionData = {
        symbol: "BTCUSDT",
        quantity,
        type,
        entry,
        date: position.date,
    };

    try {
        await updatePosition(id, positionData);
        closeEditModal();
    } catch (error) {
        // Error already handled in updatePosition
    }
});

// ========== WEBSOCKET CONNECTION ==========
function connectWebSocket() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log("✅ WebSocket connected to Binance");
        reconnectAttempts = 0;
        updateConnectionStatus(true);
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateTickerData(data);
    };

    ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        updateConnectionStatus(false);

        if (reconnectAttempts === 0) {
            showToast("Lost connection to Binance. Reconnecting...", "error");
        }
    };

    ws.onclose = () => {
        console.warn("⚠️ WebSocket disconnected");
        updateConnectionStatus(false);
        attemptReconnect();
    };
}

function attemptReconnect() {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`🔄 Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        setTimeout(connectWebSocket, delay);
    } else {
        showToast("Failed to connect to Binance. Please refresh the page.", "error");
    }
}

function updateConnectionStatus(connected) {
    const statusDot = elements.connectionStatus.querySelector(".status-dot");
    const statusText = elements.connectionStatus.querySelector(".status-text");

    if (connected) {
        elements.connectionStatus.classList.add("connected");
        statusText.textContent = "Live";
    } else {
        elements.connectionStatus.classList.remove("connected");
        statusText.textContent = reconnectAttempts > 0 ? "Reconnecting..." : "Disconnected";
    }
}

// ========== TICKER UPDATES ==========
function updateTickerData(data) {
    const price = parseFloat(data.c);
    const change = parseFloat(data.P);
    const high = parseFloat(data.h);
    const low = parseFloat(data.l);
    const volume = parseFloat(data.v);

    btcPrice = price;

    if (elements.currentPrice) {
        const oldPrice = parseFloat(elements.currentPrice.textContent.replace(/[$,]/g, "")) || 0;
        elements.currentPrice.textContent = `$${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

        // Animate color based on price movement
        if (oldPrice && price !== oldPrice) {
            elements.currentPrice.classList.add(price > oldPrice ? "price-up" : "price-down");
            setTimeout(() => elements.currentPrice.classList.remove("price-up", "price-down"), 400);
        }

        elements.priceChange.textContent = `${change.toFixed(2)}%`;
        elements.priceChange.classList.toggle("negative", change < 0);
        elements.high24h.textContent = `$${high.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        elements.low24h.textContent = `$${low.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        elements.volume24h.textContent = volume.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }

    updatePnL();
}

// ========== POSITION MANAGEMENT ==========
async function fetchPositions() {
    try {
        const res = await fetch(`${API_URL}/positions`, {
            headers: { "x-api-key": API_KEY },
        });
        if (!res.ok) throw new Error("Failed to fetch positions");
        positions = await res.json();
        renderPositions();
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function addPosition(positionData) {
    try {
        const res = await fetch(`${API_URL}/positions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
            },
            body: JSON.stringify(positionData),
        });

        if (!res.ok) throw new Error("Failed to add position");

        showToast("Position added successfully ✅", "success");
        await fetchPositions();
        elements.form.reset();
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function updatePosition(id, positionData) {
    try {
        const res = await fetch(`${API_URL}/positions/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
            },
            body: JSON.stringify(positionData),
        });

        if (!res.ok) throw new Error("Failed to update position");

        showToast("Position updated successfully ✏️", "success");
        await fetchPositions();
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function deletePosition(id) {
    try {
        const res = await fetch(`${API_URL}/positions/${id}`, {
            method: "DELETE",
            headers: { "x-api-key": API_KEY },
        });

        if (!res.ok) throw new Error("Failed to delete position");

        showToast("Position deleted 🗑️", "success");
        await fetchPositions();
    } catch (error) {
        showToast(error.message, "error");
    }
}

// ========== FORM SUBMISSION ==========
elements.form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const entry = parseFloat(elements.entryInput.value);
    const quantity = parseFloat(elements.quantityInput.value);
    const type = elements.typeInput.value;

    if (isNaN(entry) || entry <= 0 || isNaN(quantity) || quantity <= 0) {
        showToast("Please enter valid numbers", "error");
        return;
    }

    const positionData = {
        symbol: "BTCUSDT",
        entry,
        quantity,
        type,
        date: new Date().toISOString(),
    };

    await addPosition(positionData);
});

// ========== RENDER POSITIONS ==========
function renderPositions() {
    elements.positionsBody.innerHTML = "";

    if (positions.length === 0) {
        elements.positionsBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="7">
                    <div class="empty-content">
                        <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3" />
                        </svg>
                        <p>No positions yet</p>
                        <span>Add a new position to get started</span>
                    </div>
                </td>
            </tr>
        `;
        elements.positionsCount.textContent = "0";
        elements.totalPnl.textContent = "$0.00";
        return;
    }

    positions.forEach((pos) => {
        const pnl = calculatePnL(pos);
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${pos.symbol}</td>
            <td>$${pos.entry.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <td>${pos.quantity}</td>
            <td><span class="type-badge ${pos.type}">${pos.type}</span></td>
            <td class="pnl-cell ${pnl >= 0 ? "positive" : "negative"}">
                ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}%
            </td>
            <td class="date-cell">${new Date(pos.date).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-danger" onclick="deletePosition('${pos.id}')">Delete</button>
                <button class="btn btn-primary" onclick="openEditModal(${JSON.stringify(pos).replace(/"/g, "&quot;")})">Edit</button>
            </td>
        `;
        elements.positionsBody.appendChild(row);
    });

    elements.positionsCount.textContent = positions.length;
    updatePnL();
}

// ========== PNL CALCULATION ==========
function calculatePnL(pos) {
    if (!btcPrice || !pos.entry) return 0;
    const diff = pos.type === "buy" ? btcPrice - pos.entry : pos.entry - btcPrice;
    return (diff / pos.entry) * 100;
}

function updatePnL() {
    if (!positions.length) return;
    const total = positions.reduce((acc, p) => acc + calculatePnL(p), 0);
    const avgPnl = total / positions.length;
    elements.totalPnl.textContent = `${avgPnl >= 0 ? "+" : ""}${avgPnl.toFixed(2)}%`;
    elements.totalPnl.classList.toggle("negative", avgPnl < 0);
}

// ========== TOAST SYSTEM ==========
function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            ${type === "success"
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />'}
        </svg>
        <div class="toast-message">${message}</div>
    `;

    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ========== INITIALIZATION ==========
function initializeApp() {
    connectWebSocket();
    fetchPositions();
}

window.addEventListener("DOMContentLoaded", loadConfig);
