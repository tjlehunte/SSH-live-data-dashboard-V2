document.addEventListener("DOMContentLoaded", () => {

let mainChart = null;
let currentChart = null;
let tempCols = [];
let humCols = [];
let dewCols = [];
let gpkgCols = [];
let heatindexCols = [];
let wetbulbCols = [];
let current3Cols = [];
let currentcumCols = [];
let allData = [];

function shortenLabel(col) {
  return col.split(" - ")[0];
}

function showEnvSpinner() {
  document.getElementById("envSpinner").style.display = "block";
}
function hideEnvSpinner() {
  document.getElementById("envSpinner").style.display = "none";
}
function showCurrentSpinner() {
  document.getElementById("currentSpinner").style.display = "block";
}
function hideCurrentSpinner() {
  document.getElementById("currentSpinner").style.display = "none";
}

const ROOM_COLORS = [
  "#800000", "#9A6324", "#469990", "#000075", "#000000",
  "#e6194B", "#f58231", "#ffe119", "#3cb44b", "#42d4f4",
  "#f032e6", "#dcbeff", "#aaffc3", "#911eb4", "#a9a9a9",
  "#ffd8b1"
];

const CURRENT_METRIC_COLORS = {
  "Minimum current": "#00c8f0",
  "Maximum current": "#ff1a1a",
  "Average current": "#00cc44"
};

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

  const gridColors = labels.map((_, i) => {
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return i % 3 === 0 ? (isDark ? "#444" : "#ccc") : "transparent";
});
  
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

  // ⭐ RECOMPUTE Y‑AXIS RANGE
  const allValues = datasets
    .flatMap(ds => ds.data)
    .map(v => Number(v))
    .filter(v => Number.isFinite(v));

  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);

  const roundedMax = Math.ceil(maxValue / 5) * 5;
  const roundedMin = Math.floor(minValue / 5) * 5;

  // Dark mode detection
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const gridColor = isDark ? "#444" : "#ccc";
  const textColor = isDark ? "#ddd" : "#000";

  // Update chart data
  mainChart.data.labels = labels;
  mainChart.data.datasets = datasets;

  // Update titles
  mainChart.options.plugins.title.text = title;
  mainChart.options.scales.y.title.text = unit;

  // ⭐ APPLY NEW Y‑AXIS RANGE
  mainChart.options.scales.y.min = roundedMin;
  mainChart.options.scales.y.max = roundedMax;

  // Restore theme
  mainChart.options.plugins.legend.labels.color = textColor;
  mainChart.options.scales.x.ticks.color = textColor;
  mainChart.options.scales.y.ticks.color = textColor;
  mainChart.options.scales.x.title.color = textColor;
  mainChart.options.scales.y.title.color = textColor;

  // Restore grid colors + lines
  mainChart.options.scales.x.grid.color = gridColors;
  mainChart.options.scales.y.grid.color = gridColor;
  
  mainChart.update();
}


function drawCurrentChart(data, cols, title, unit = "Current (A)") {
  const labels = data.map(d => d.MessageDate);

  const gridColors = labels.map((_, i) => {
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return i % 3 === 0 ? (isDark ? "#444" : "#ccc") : "transparent";
});
  
  const datasets = cols.map(col => {
    const metric = col.split(" - ")[1];
    const color = CURRENT_METRIC_COLORS[metric];
    return {
      label: metric,
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

  // ⭐ RECOMPUTE Y‑AXIS RANGE
  const allValues = datasets
  .flatMap(ds => ds.data)
  .map(v => Number(v))
  .filter(v => Number.isFinite(v));

  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);

  const roundedMax = Math.ceil(maxValue / 5) * 5;
  const roundedMin = Math.floor(minValue / 5) * 5;
  
  // Dark mode detection
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const gridColor = isDark ? "#444" : "#ccc";
  const textColor = isDark ? "#ddd" : "#000";

  // Update chart data
  currentChart.data.labels = labels;
  currentChart.data.datasets = datasets;

  // Update chart title + axis labels
  currentChart.options.plugins.title.text = title;
  currentChart.options.scales.y.title.text = unit;

  // ⭐ APPLY NEW Y‑AXIS RANGE
  currentChart.options.scales.y.min = roundedMin;
  currentChart.options.scales.y.max = roundedMax;

  // Restore text colours
  currentChart.options.plugins.legend.labels.color = textColor;
  currentChart.options.scales.x.ticks.color = textColor;
  currentChart.options.scales.y.ticks.color = textColor;
  currentChart.options.scales.x.title.color = textColor;
  currentChart.options.scales.y.title.color = textColor;

  // Restore grid colours
  currentChart.options.scales.x.grid.color = gridColors;
  currentChart.options.scales.y.grid.color = gridColor;

  currentChart.update();
}

function initTabs() {
  document.querySelectorAll("#envTabs .tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("#envTabs .tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const type = tab.dataset.type;
    if (type === "temperature") drawMainChart(allData, tempCols,      "Temperature Sensors",            "Temperature (°C)");
    if (type === "humidity")    drawMainChart(allData, humCols,       "Humidity Sensors",               "Humidity (%)");
    if (type === "dewpoint")    drawMainChart(allData, dewCols,       "Dew Point Sensors",              "Dew Point (°C)");
    if (type === "gpkg")        drawMainChart(allData, gpkgCols,      "Grams per Kilogram Sensors",     "Grams per Kilogram (g/kg)");
    if (type === "heatindex")   drawMainChart(allData, heatindexCols, "Heat Index Sensors",             "Heat Index (°C)");
    if (type === "wetbulb")     drawMainChart(allData, wetbulbCols,   "Wet-Bulb Temperature Sensors",   "Wet Bulb (°C)");
  });
});
  document.querySelectorAll("#currentTabs .tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("#currentTabs .tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const type = tab.dataset.type;
    if (type === "current-summary")    drawCurrentChart(allData, current3Cols,   "Current (Min / Max / Avg)",    "Current (A)");
    if (type === "current-cumulative") drawCurrentChart(allData, currentcumCols, "Cumulative Current (Ah)",      "Amp-Hours (Ah)");
  });
});
}

async function loadData() {
  
  const envcanvas = document.getElementById("mainChart");
  envcanvas.classList.add("loading");
  const currentcanvas = document.getElementById("currentChart");
  currentcanvas.classList.add("loading");
  showEnvSpinner();
  showCurrentSpinner();

  const response = await fetch("https://monnit-plumber-api.onrender.com/data");
  const data = await response.json();
  allData = data;
  
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const gridColor = isDark ? "#444" : "#ccc";
  const textColor = isDark ? "#ddd" : "#000";
  
  const columns = Object.keys(data[0]);

  tempCols        = columns.filter(c => c.toLowerCase().includes("temp"));
  humCols         = columns.filter(c => c.toLowerCase().includes("humid"));
  dewCols         = columns.filter(c => c.toLowerCase().includes("dewpoint"));
  gpkgCols        = columns.filter(c => c.toLowerCase().includes("gpkg"));
  heatindexCols   = columns.filter(c => c.toLowerCase().includes("heat index"));
  wetbulbCols     = columns.filter(c => c.toLowerCase().includes("wet bulb"));
  current3Cols    = columns.filter(c =>
    c.toLowerCase().includes("average current") ||
    c.toLowerCase().includes("maximum current") ||
    c.toLowerCase().includes("minimum current"));
  currentcumCols  = columns.filter(c => c.toLowerCase().includes("amp hours"));

  if (!mainChart) {
    const ctx = document.getElementById("mainChart").getContext("2d");
    mainChart = new Chart(ctx, {
      type: "line",
      data: { labels: [], datasets: [] },
      options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 400,
        easing: "easeInOutQuart"},
      interaction: { mode: "index", intersect: false },
      elements: {
        point: {
          pointStyle: "rect",
          radius: 6,
          hoverRadius: 6
        }
      },
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: textColor,
            usePointStyle: true,
            pointStyle: "rect",
            pointStyleWidth: 16,
            generateLabels: function(chart) {
              return chart.data.datasets.map((ds, i) => {
                return ({
                  text: ds.label,
                  fillStyle: ds.backgroundColor,
                  strokeStyle: ds.backgroundColor,
                  lineWidth: 0,
                  pointStyle: "rect",
                  fontColor: textColor,
                  hidden: !chart.isDatasetVisible(i),
                  datasetIndex: i
                });
              });
            }
          }
        },
        tooltip: { enabled: true },
        title: {
          display: true,
          text: "",
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
              if (index % 12 === 0) return this.getLabelForValue(value);
              return "";
            }
          },
          grid: {}
        },
        y: {
          min: 0,
          max: 1,
          ticks: { color: textColor },
          grid: { color: gridColor },
          title: {
            display: true,
            text: "",
            align: "center",
            color: textColor
          }
        }
      }
    }
    });
  }

  if (!currentChart) {
  const ctx2 = document.getElementById("currentChart").getContext("2d");
  currentChart = new Chart(ctx2, {
    type: "line",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 400,
        easing: "easeInOutQuart"},
      interaction: { mode: "index", intersect: false },
      elements: {
        point: {
          pointStyle: "rect",
          radius: 6,
          hoverRadius: 6
        }
      },
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: textColor,
            usePointStyle: true,
            pointStyle: "rect",
            pointStyleWidth: 16,
            generateLabels: function(chart) {
              return chart.data.datasets.map((ds, i) => {
                return ({
                  text: ds.label,
                  fillStyle: ds.backgroundColor,
                  strokeStyle: ds.backgroundColor,
                  lineWidth: 0,
                  pointStyle: "rect",
                  fontColor: textColor,
                  hidden: !chart.isDatasetVisible(i),
                  datasetIndex: i
                });
              });
            }
          }
        },
        tooltip: { enabled: true },
        title: {
          display: true,
          text: "",
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
              if (index % 12 === 0) return this.getLabelForValue(value);
              return "";
            }
          },
          grid: {}
        },
        y: {
          min: 0,
          max: 1,
          ticks: { color: textColor },
          grid: { color: gridColor },
          title: {
            display: true,
            text: "",
            align: "center",
            color: textColor
          }
        }
      }
    }
    });
  }
  
  drawMainChart(allData, tempCols, "Temperature Sensors");
  hideEnvSpinner();
  envcanvas.classList.remove("loading");

  drawCurrentChart(allData, current3Cols, "Current (Min / Max / Avg)", "Current (A)");
  hideCurrentSpinner();
  currentcanvas.classList.remove("loading");

  if (!window.tabsInitialised) {
    window.tabsInitialised = true;
    initTabs();
  }
}

loadData();

setInterval(loadData, 10 * 60 * 1000);

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  loadData();
});

}); // end DOMContentLoaded
