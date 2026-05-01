let mainChart = null;
let tempCols = [];
let humCols = [];
let allData = [];

// Load data once
async function loadData() {
  showSpinner();

  const response = await fetch("https://monnit-plumber-api.onrender.com/data");
  const data = await response.json();
  allData = data;

  const columns = Object.keys(data[0]);

  tempCols = columns.filter(c => c.toLowerCase().includes("temp"));
  humCols  = columns.filter(c => c.toLowerCase().includes("humid"));

  // Default chart = Temperature
  drawMainChart(allData, tempCols, "Temperature Sensors");

  hideSpinner();
}

function shortenLabel(col) {
  return col.split(" - ")[0];
}

const ROOM_COLORS = [
  "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
  "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe",
  "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000",
  "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080"
];

const roomColorMap = {};
let roomColorIndex = 0;

function getRoomColor(room) {
  if (!roomColorMap[room]) {
    roomColorMap[room] = ROOM_COLORS[roomColorIndex % ROOM_COLORS.length];
    roomColorIndex++;
  }
  return roomColorMap[room];
}

function drawMainChart(data, cols, title) {
  const labels = data.map(d => d.MessageDate);
const datasets = cols.map(col => {
  const room = col.split(" - ")[0];
  const color = getRoomColor(room);
  return {
    label: room,
    data: data.map(d => d[col]),
    borderColor: color,
    backgroundColor: color,
    pointStyle: "rect",
    borderWidth: 1,
    pointRadius: 1,
    pointHoverRadius: 4,
    tension: 0.2,
    fill: false
  };
});


  const ctx = document.getElementById("mainChart").getContext("2d");

  if (mainChart) mainChart.destroy();

  mainChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom" },
        tooltip: { enabled: true },
        title: {
          display: true,
          text: title
        }
      }
    }
  });
}

function randomColor() {
  return `hsl(${Math.random() * 360}, 70%, 50%)`;
}

function showSpinner() {
  document.getElementById("loading").style.display = "block";
}

function hideSpinner() {
  document.getElementById("loading").style.display = "none";
}

loadData();

// Auto-refresh every 10 minutes
setInterval(loadData, 10 * 60 * 1000);

// TAB CLICK HANDLER
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const type = tab.dataset.type;

    if (type === "temperature") {
      drawMainChart(allData, tempCols, "Temperature Sensors");
    } else {
      drawMainChart(allData, humCols, "Humidity Sensors");
    }
  });
});
