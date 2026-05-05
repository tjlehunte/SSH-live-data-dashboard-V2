let mainChart = null;
let currentChart = null;
let tempCols = [];
let humCols = [];
let dewCols = [];
let gpkgCols = [];
let heatindexCols = [];
let wetbulbCols = [];
let currentCols = [];
let allData = [];

function shortenLabel(col) {
  return col.split(" - ")[0];
}

const ROOM_COLORS = [
  "#800000", "#9A6324", "#469990", "#000075", "#000000",
  "#e6194B", "#f58231", "#ffe119", "#3cb44b", "#42d4f4",
  "#f032e6", "#dcbeff", "#aaffc3", "#911eb4", "#a9a9a9",
  "#ffd8b1"
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

function drawMainChart(data, cols, title, unit = "Temperature (°C)") {
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

  // Collect all numeric values from all datasets
const allValues = datasets
  .flatMap(ds => ds.data)
  .map(v => Number(v))
  .filter(v => Number.isFinite(v));

// Compute Y-axis max
const maxValue = Math.max(...allValues);
// Compute Y-axis min
const minValue = Math.min(...allValues);

const roundedMax = Math.ceil(maxValue / 5) * 5;
const roundedMin = Math.floor(minValue / 5) * 5;

console.log({ minValue, maxValue, roundedMin, roundedMax });
  
  // Dark mode detection
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const gridColor = isDark ? "#444" : "#ccc";
  const textColor = isDark ? "#ddd" : "#000";

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
        legend: { position: "right" },
        tooltip: { enabled: true },
        title: {
          display: true,
          text: title,
          color: textColor
        }
      },

      layout: {
        padding: { bottom: 20 }
      },

      scales: {
        x: {
          title: {
            display: true,
            text: "Time",
            align: "center",
            color: textColor
          },
          ticks: {
            color: textColor,
            autoSkip: false,
            callback: function(value, index) {
              if (index % 12 === 0) {
                return this.getLabelForValue(value);
              }
              return "";
            }
          },
          grid: { color: gridColor }
        },
        y: {
          min: roundedMin,
          max: roundedMax,
          ticks: { color: textColor },
          grid: { color: gridColor },
          title: {
            display: true,
            text: unit,
            align: "center",
            color: textColor
          }
        }
      }
    }
  });
}

function drawCurrentChart(data, cols, title, unit = "Current (A)") {
  const labels = data.map(d => d.MessageDate);

  const datasets = cols.map(col => {
    const room = col.split(" - ")[0];
    const color = getRoomColor(room);
    return {
      label: room,
      data: data.map(d => d[col]),
      borderColor: color,
      backgroundColor: color,
      borderWidth: 1,
      pointRadius: 1,
      tension: 0.2
    };
  });
    const ctx = document.getElementById("currentChart").getContext("2d");

  if (currentChart) currentChart.destroy();

  currentChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right" },
        title: { display: true, text: title }
      },
      scales: {
        y: { title: { display: true, text: unit } }
      }
    }
  });
}

// Load data once
async function loadData() {
  showSpinner();

  const response = await fetch("https://monnit-plumber-api.onrender.com/data");
  const data = await response.json();
  allData = data;

  const columns = Object.keys(data[0]);

  tempCols = columns.filter(c => c.toLowerCase().includes("temp"));
  humCols  = columns.filter(c => c.toLowerCase().includes("humid"));
  dewCols = columns.filter(c => c.toLowerCase().includes("dewpoint"));
  gpkgCols = columns.filter(c => c.toLowerCase().includes("gpkg"));
  heatindexCols = columns.filter(c => c.toLowerCase().includes("heat index"));
  wetbulbCols = columns.filter(c => c.toLowerCase().includes("wet bulb"));
  current3Cols = columns.filter(c =>
    c.toLowerCase().includes("average current") ||
    c.toLowerCase().includes("maximum current") ||
    c.toLowerCase().includes("minimum current"));
  currentcumCols = columns.filter(c => c.toLowerCase().includes("amp hours"));

  console.log(columns);

  // Default chart = Temperature
  drawMainChart(allData, tempCols, "Temperature Sensors");

  // Default current chart = min max avg
  drawCurrentChart(allData, current3Cols, "Current (Min / Max / Avg)", "Current (A)");

  hideSpinner();
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
document.querySelectorAll("#envTabs .tab").forEach(tab => {
  tab.addEventListener("click", () => {

    // Remove active class from all tabs
    document.querySelectorAll("#envTabs .tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const type = tab.dataset.type;

    if (type === "temperature") {
      drawMainChart(allData, tempCols, "Temperature Sensors", "Temperature (°C)");
    }
    if (type === "humidity") {
      drawMainChart(allData, humCols, "Humidity Sensors", "Humidity (%)");
    }
    if (type === "dewpoint") {
      drawMainChart(allData, dewCols, "Dew Point Sensors", "Dew Point (°C)");
    }
    if (type === "gpkg") {
      drawMainChart(allData, gpkgCols, "Grams per Kilogram Sensors", "Grams per Kilogram (g/kg)");
    }
    if (type === "heatindex") {
      drawMainChart(allData, heatindexCols, "Heat Index Sensors", "Heat Index (°C)");
    }
    if (type === "wetbulb") {
      drawMainChart(allData, wetbulbCols, "Wet-Bulb Temperature Sensors", "Wet Bulb (°C)");
    }
  });
});

document.querySelectorAll("#currentTabs .tab").forEach(tab => {
  tab.addEventListener("click", () => {

    document.querySelectorAll("#currentTabs .tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const type = tab.dataset.type;

    if (type === "current-summary") {
      drawCurrentChart(allData, current3Cols, "Current (Min / Max / Avg)", "Current (A)");
    }
    if (type === "current-cumulative") {
      drawCurrentChart(allData,currentcumCols,"Cumulative Current (Ah)", "Amp-Hours (Ah)");
    }
  });
});

// Auto-update chart when system theme changes
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  loadData(); // redraw chart with new theme
});

