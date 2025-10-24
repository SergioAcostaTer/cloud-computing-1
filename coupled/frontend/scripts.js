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
        elements.currentPrice.textContent = `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Animate color based on price movement
        if (oldPrice && price !== oldPrice) {
            elements.currentPrice.classList.remove("price-up", "price-down");
            void elements.currentPrice.offsetWidth; // Force reflow
            elements.currentPrice.classList.add(price > oldPrice ? "price-up" : "price-down");
            setTimeout(() => elements.currentPrice.classList.remove("price-up", "price-down"), 400);
        }

        const changeSpan = elements.priceChange.querySelector('span');
        if (changeSpan) {
            changeSpan.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        }
        elements.priceChange.classList.toggle("negative", change < 0);

        elements.high24h.textContent = `$${high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        elements.low24h.textContent = `$${low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
        console.log(res);
        if (!res.ok) throw new Error("Failed to fetch positions");
        positions = await res.json();
        renderPositions();
    } catch (error) {
        console.error("Error fetching positions:", error);
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
        console.error("Error adding position:", error);
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
        console.error("Error updating position:", error);
        showToast(error.message, "error");
        throw error;
    }
}

async function deletePosition(id) {
    if (!confirm("Are you sure you want to delete this position?")) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/positions/${id}`, {
            method: "DELETE",
            headers: { "x-api-key": API_KEY },
        });

        if (!res.ok) throw new Error("Failed to delete position");

        showToast("Position deleted 🗑️", "success");
        await fetchPositions();
    } catch (error) {
        console.error("Error deleting position:", error);
        showToast(error.message, "error");
    }
}

// Make deletePosition available globally
window.deletePosition = deletePosition;

// ========== FORM SUBMISSION ==========
elements.form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const entry = parseFloat(elements.entryInput.value);
    const quantity = parseFloat(elements.quantityInput.value);
    const type = elements.typeInput.value;

    if (isNaN(entry) || entry <= 0) {
        showToast("Please enter a valid entry price", "error");
        return;
    }

    if (isNaN(quantity) || quantity <= 0) {
        showToast("Please enter a valid quantity", "error");
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
                <td colspan="9">
                    <div class="empty-content">
                        <svg class="empty-icon" viewBox="0 0 24 24" fill="none">
                            <path d="M9 11L12 14L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <p>No positions yet</p>
                        <span>Add your first position to start tracking</span>
                    </div>
                </td>
            </tr>
        `;
        elements.positionsCount.textContent = "0 positions";
        elements.totalPnl.textContent = "$0.00";
        elements.totalPnl.classList.remove("negative");
        return;
    }

    positions.forEach((pos) => {
        const currentValue = btcPrice * pos.quantity;
        const entryValue = pos.entry * pos.quantity;
        const pnlPercent = calculatePnL(pos);
        const pnlAbsolute = pos.type === "buy"
            ? currentValue - entryValue
            : entryValue - currentValue;

        const row = document.createElement("tr");

        // Escape JSON for HTML attribute
        const positionJson = JSON.stringify(pos).replace(/"/g, '&quot;');

        row.innerHTML = `
            <td>$${pos.entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>$${btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${pos.quantity.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 8 })} BTC</td>
            <td><span class="type-badge ${pos.type}">${pos.type === 'buy' ? 'Buy / Long' : 'Sell / Short'}</span></td>
            <td>$${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="pnl-cell ${pnlAbsolute >= 0 ? "positive" : "negative"}">
                ${pnlAbsolute >= 0 ? "+" : ""}$${Math.abs(pnlAbsolute).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td class="pnl-cell ${pnlPercent >= 0 ? "positive" : "negative"}">
                ${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%
            </td>
            <td class="date-cell">${new Date(pos.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
            <td class="action-cell">
                <div class="action-buttons">
                    <button class="btn-action btn-edit" onclick='openEditModal(${positionJson})' title="Edit">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.43741 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="btn-action btn-delete" onclick="deletePosition('${pos.id}')" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        elements.positionsBody.appendChild(row);
    });

    elements.positionsCount.textContent = `${positions.length} position${positions.length !== 1 ? 's' : ''}`;
    updatePnL();
}

// ========== PNL CALCULATION ==========
function calculatePnL(pos) {
    if (!btcPrice || !pos.entry) return 0;
    const diff = pos.type === "buy" ? btcPrice - pos.entry : pos.entry - btcPrice;
    return (diff / pos.entry) * 100;
}

function updatePnL() {
    if (!positions.length || !btcPrice) {
        elements.totalPnl.textContent = "$0.00";
        elements.totalPnl.classList.remove("negative");
        return;
    }

    const totalPnlAbsolute = positions.reduce((acc, p) => {
        const currentValue = btcPrice * p.quantity;
        const entryValue = p.entry * p.quantity;
        const pnl = p.type === "buy" ? currentValue - entryValue : entryValue - currentValue;
        return acc + pnl;
    }, 0);

    elements.totalPnl.textContent = `${totalPnlAbsolute >= 0 ? "+" : ""}$${Math.abs(totalPnlAbsolute).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    elements.totalPnl.classList.toggle("negative", totalPnlAbsolute < 0);
}

// ========== TOAST SYSTEM ==========
function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none">
            ${type === "success"
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" stroke="currentColor" />'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" stroke="currentColor" />'}
        </svg>
        <div class="toast-message">${message}</div>
    `;

    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "slideOut 0.3s ease forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// ========== INITIALIZATION ==========
function initializeApp() {
    connectWebSocket();
    fetchPositions();
    // Refresh positions periodically to keep data in sync
    setInterval(fetchPositions, 30000);
}

// Close modals when clicking outside
window.addEventListener("click", (e) => {
    if (e.target === elements.configModal) {
        closeConfigModal();
    }
    if (e.target === elements.editModal) {
        closeEditModal();
    }
});

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
    if (ws) {
        ws.close();
    }
});

window.addEventListener("DOMContentLoaded", loadConfig);