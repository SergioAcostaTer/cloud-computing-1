const API_URL = window.location.origin;
const tickerDiv = document.getElementById("ticker");
const positionsTable = document.getElementById("positions");
const form = document.getElementById("form");
const entryInput = document.getElementById("entry");
const quantityInput = document.getElementById("quantity");
const typeInput = document.getElementById("type");

let btcPrice = 0;
let positions = [];

// --- WebSocket Binance ---
const socket = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@ticker");

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  btcPrice = parseFloat(data.c);
  const change = parseFloat(data.P);
  const color = change >= 0 ? "profit" : "loss";
  tickerDiv.innerHTML = `
    <strong>BTC/USDT:</strong> <span class="${color}">${btcPrice.toFixed(2)}</span>
    (<span class="${color}">${change.toFixed(2)}%</span>)
  `;
  updatePL();
};

socket.onopen = () => (tickerDiv.textContent = "Connected to Binance ✅");
socket.onclose = () => (tickerDiv.textContent = "Disconnected ❌");

// --- API calls ---
async function loadPositions() {
  try {
    const res = await fetch(`${API_URL}/items`);
    positions = await res.json();
    renderPositions();
  } catch (err) {
    console.error("Error loading positions:", err);
  }
}

async function addPosition(e) {
  e.preventDefault();
  const position = {
    symbol: "BTCUSDT",
    quantity: parseFloat(quantityInput.value),
    type: typeInput.value,
    date: new Date().toISOString(),
    entry: parseFloat(entryInput.value),
  };

  const res = await fetch(`${API_URL}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(position),
  });

  const saved = await res.json();
  positions.push(saved);
  renderPositions();
  form.reset();
}

async function deletePosition(id) {
  await fetch(`${API_URL}/items/${id}`, { method: "DELETE" });
  positions = positions.filter((p) => p.id !== id);
  renderPositions();
}

// --- UI updates ---
function updatePL() {
  positions.forEach((p, i) => {
    const pl =
      p.type === "buy"
        ? (btcPrice - (p.entry || 0)) * p.quantity
        : ((p.entry || 0) - btcPrice) * p.quantity;
    const cell = document.getElementById(`pl-${i}`);
    if (cell) {
      cell.textContent = pl.toFixed(2);
      cell.className = pl >= 0 ? "profit" : "loss";
    }
    const cur = document.getElementById(`cur-${i}`);
    if (cur) cur.textContent = btcPrice.toFixed(2);
  });
}

function renderPositions() {
  positionsTable.innerHTML = positions
    .map(
      (p, i) => `
    <tr>
      <td>${(p.entry || 0).toFixed(2)}</td>
      <td>${p.quantity}</td>
      <td>${p.type}</td>
      <td id="cur-${i}">-</td>
      <td id="pl-${i}" class="profit">-</td>
      <td><button class="btn-primary" style="background:#ef4444" onclick="deletePosition('${p.id}')">Delete</button></td>
    </tr>
  `
    )
    .join("");
  updatePL();
}

// --- Init ---
form.addEventListener("submit", addPosition);
loadPositions();
