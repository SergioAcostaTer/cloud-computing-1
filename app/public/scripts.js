// ========== CONFIGURATION ==========
const API_URL = window.location.origin;
const WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@ticker";

// ========== STATE ==========
let btcPrice = 0;
let positions = [];
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// ========== DOM ELEMENTS ==========
const elements = {
    // Navigation
    connectionStatus: document.getElementById("connection-status"),

    // Ticker
    currentPrice: document.getElementById("current-price"),
    priceChange: document.getElementById("price-change"),
    high24h: document.getElementById("high-24h"),
    low24h: document.getElementById("low-24h"),
    volume24h: document.getElementById("volume-24h"),

    // Form
    form: document.getElementById("position-form"),
    entryInput: document.getElementById("entry"),
    quantityInput: document.getElementById("quantity"),
    typeInput: document.getElementById("type"),

    // Table
    positionsBody: document.getElementById("positions-body"),
    positionsCount: document.getElementById("positions-count"),
    totalPnl: document.getElementById("total-pnl"),

    // Toast
    toastContainer: document.getElementById("toast-container"),
};

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

    // Update global price
    btcPrice = price;

    // Update current price with animation
    if (elements.currentPrice) {
        const oldPrice = parseFloat(elements.currentPrice.textContent.replace(/[$,]/g, ""));
        elements.currentPrice.textContent = `$${formatNumber(price, 2)}`;

        // Flash animation on price change
        if (oldPrice && oldPrice !== price) {
            elements.currentPrice.style.animation = "none";
            setTimeout(() => {
                elements.currentPrice.style.animation = price > oldPrice
                    ? "flashGreen 0.5s ease"
                    : "flashRed 0.5s ease";
            }, 10);
        }
    }

    // Update price change
    if (elements.priceChange) {
        const span = elements.priceChange.querySelector("span");
        const isNegative = change < 0;

        elements.priceChange.classList.toggle("negative", isNegative);
        span.textContent = `${change > 0 ? "+" : ""}${change.toFixed(2)}%`;
    }

    // Update 24h stats
    if (elements.high24h) elements.high24h.textContent = `$${formatNumber(high, 2)}`;
    if (elements.low24h) elements.low24h.textContent = `$${formatNumber(low, 2)}`;
    if (elements.volume24h) elements.volume24h.textContent = `${formatNumber(volume, 0)} BTC`;

    // Update all positions P&L
    updateAllPositionsPnL();
}

// ========== API CALLS ==========
async function loadPositions() {
    try {
        const response = await fetch(`${API_URL}/items`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        positions = await response.json();
        renderPositions();
        updateTotalPnL();

    } catch (error) {
        console.error("Error loading positions:", error);
        showToast("Failed to load positions. Please try again.", "error");
    }
}

async function createPosition(positionData) {
    try {
        const response = await fetch(`${API_URL}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(positionData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const newPosition = await response.json();
        positions.push(newPosition);
        renderPositions();
        updateTotalPnL();
        showToast("Position added successfully! 🎉", "success");

        return newPosition;

    } catch (error) {
        console.error("Error creating position:", error);
        showToast("Failed to create position. Please try again.", "error");
        throw error;
    }
}

async function deletePosition(id) {
    try {
        const response = await fetch(`${API_URL}/items/${id}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        positions = positions.filter(p => p.id !== id);
        renderPositions();
        updateTotalPnL();
        showToast("Position deleted successfully", "success");

    } catch (error) {
        console.error("Error deleting position:", error);
        showToast("Failed to delete position. Please try again.", "error");
    }
}

// ========== FORM HANDLING ==========
elements.form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const entry = parseFloat(elements.entryInput.value);
    const quantity = parseFloat(elements.quantityInput.value);
    const type = elements.typeInput.value;

    // Validation
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
        quantity,
        type,
        entry,
        date: new Date().toISOString(),
    };

    try {
        await createPosition(positionData);
        elements.form.reset();
        elements.entryInput.focus();
    } catch (error) {
        // Error already handled in createPosition
    }
});

// ========== RENDERING ==========
function renderPositions() {
    if (!elements.positionsBody) return;

    // Update count
    if (elements.positionsCount) {
        const count = positions.length;
        elements.positionsCount.textContent = `${count} position${count !== 1 ? "s" : ""}`;
    }

    // Render table
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
        return;
    }

    elements.positionsBody.innerHTML = positions
        .map((position) => {
            const { id, entry = 0, quantity = 0, type, date } = position;
            const currentPrice = btcPrice || entry;

            // Calculate P&L
            const pnl = calculatePnL(entry, currentPrice, quantity, type);
            const pnlPercent = ((pnl / (entry * quantity)) * 100) || 0;
            const value = quantity * currentPrice;

            // Format date
            const formattedDate = new Date(date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });

            return `
        <tr data-id="${id}">
          <td><strong>$${formatNumber(entry, 2)}</strong></td>
          <td id="current-${id}"><strong>$${formatNumber(currentPrice, 2)}</strong></td>
          <td>${quantity.toFixed(5)} BTC</td>
          <td>
            <span class="type-badge ${type}">
              ${type === "buy" ? "Long" : "Short"}
            </span>
          </td>
          <td><strong>$${formatNumber(value, 2)}</strong></td>
          <td id="pnl-${id}" class="pnl-cell ${pnl >= 0 ? "positive" : "negative"}">
            ${pnl >= 0 ? "+" : ""}$${formatNumber(Math.abs(pnl), 2)}
          </td>
          <td class="pnl-cell ${pnlPercent >= 0 ? "positive" : "negative"}">
            ${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%
          </td>
          <td class="date-cell">${formattedDate}</td>
          <td>
            <button class="btn btn-danger" onclick="handleDelete('${id}')">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none">
                <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Delete
            </button>
          </td>
        </tr>
      `;
        })
        .join("");
}

function updateAllPositionsPnL() {
    if (!btcPrice || positions.length === 0) return;

    positions.forEach((position) => {
        const { id, entry = 0, quantity = 0, type } = position;
        const pnl = calculatePnL(entry, btcPrice, quantity, type);
        const pnlPercent = ((pnl / (entry * quantity)) * 100) || 0;

        // Update current price cell
        const currentCell = document.getElementById(`current-${id}`);
        if (currentCell) {
            currentCell.innerHTML = `<strong>$${formatNumber(btcPrice, 2)}</strong>`;
        }

        // Update P&L cell
        const pnlCell = document.getElementById(`pnl-${id}`);
        if (pnlCell) {
            pnlCell.textContent = `${pnl >= 0 ? "+" : ""}$${formatNumber(Math.abs(pnl), 2)}`;
            pnlCell.className = `pnl-cell ${pnl >= 0 ? "positive" : "negative"}`;
        }
    });

    updateTotalPnL();
}

function updateTotalPnL() {
    if (!elements.totalPnl) return;

    const total = positions.reduce((sum, position) => {
        const { entry = 0, quantity = 0, type } = position;
        const currentPrice = btcPrice || entry;
        return sum + calculatePnL(entry, currentPrice, quantity, type);
    }, 0);

    elements.totalPnl.textContent = `${total >= 0 ? "+" : ""}$${formatNumber(Math.abs(total), 2)}`;
    elements.totalPnl.className = `pnl-value ${total >= 0 ? "" : "negative"}`;
}

// ========== UTILITY FUNCTIONS ==========
function calculatePnL(entryPrice, currentPrice, quantity, type) {
    if (type === "buy") {
        return (currentPrice - entryPrice) * quantity;
    } else {
        return (entryPrice - currentPrice) * quantity;
    }
}

function formatNumber(num, decimals = 2) {
    return num.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icon = type === "success"
        ? '<svg class="toast-icon" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg class="toast-icon" viewBox="0 0 24 24" fill="none"><path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    toast.innerHTML = `
    ${icon}
    <span class="toast-message">${message}</span>
  `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "slideIn 0.3s ease reverse";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== GLOBAL FUNCTIONS (for onclick) ==========
window.handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this position?")) {
        await deletePosition(id);
    }
};

// ========== ANIMATION STYLES ==========
const style = document.createElement("style");
style.textContent = `
  @keyframes flashGreen {
    0%, 100% { background-color: transparent; }
    50% { background-color: rgba(14, 203, 129, 0.2); }
  }
  
  @keyframes flashRed {
    0%, 100% { background-color: transparent; }
    50% { background-color: rgba(246, 70, 93, 0.2); }
  }
`;
document.head.appendChild(style);

// ========== INITIALIZATION ==========
console.log("🚀 Bitcoin Tracker initializing...");
connectWebSocket();
loadPositions();

// Auto-refresh positions every 30 seconds
setInterval(loadPositions, 30000);

console.log("✅ Bitcoin Tracker ready!");