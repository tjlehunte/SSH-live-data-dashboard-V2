document.addEventListener("DOMContentLoaded", () => {

  let mainChart = null;
  let givenergyChart = null;
  let tempCols = [];
  let humCols = [];
  let dewCols = [];
  let gpkgCols = [];
  let heatindexCols = [];
  let wetbulbCols = [];
  let current3Cols = [];
  let currentcumCols = [];
  let allData = [];
  let givenergyData = [];

function showSpinner() {
  document.getElementById("spinner").style.display = "block";
}
function hideSpinner() {
  document.getElementById("spinner").style.display = "none";
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

function drawChart(data, cols, title, unit, isCurrentChart = false) {
  const labels = data.map(d => d.MessageDate);

  const gridColors = labels.map((_, i) => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return i % 3 === 0 ? (isDark ? "#444" : "#ccc") : "transparent";
  });

  const datasets = cols.map(col => {
    const parts = col.split(" - ");
    const label = isCurrentChart ? parts[1] : parts[0];
    const color = isCurrentChart ? CURRENT_METRIC_COLORS[parts[1]] : getRoomColor(parts[0]);
    return {
      label,
      data: data.map(d => d[col]),
      borderColor: color,
      backgroundColor: color,
      pointStyle: "rect",
      borderWidth: 1,
      pointRadius: 1,
      pointHoverRadius: 8,
      tension: 0.2,
      fill: false
    };
  });

  const allValues = datasets
    .flatMap(ds => ds.data)
    .map(v => Number(v))
    .filter(v => Number.isFinite(v));

  const roundedMax = Math.ceil(Math.max(...allValues) / 5) * 5;
  const roundedMin = Math.floor(Math.min(...allValues) / 5) * 5;

  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const gridColor = isDark ? "#444" : "#ccc";
  const textColor = isDark ? "#ddd" : "#000";

  mainChart.data.labels = labels;
  mainChart.data.datasets = datasets;
  
  mainChart.options.plugins.title.text = title;
  mainChart.options.scales.y.title.text = unit;
  
  mainChart.options.scales.y.min = roundedMin;
  mainChart.options.scales.y.max = roundedMax;
  
  mainChart.options.plugins.legend.labels.color = textColor;
  
  mainChart.options.scales.x.ticks.color = textColor;
  mainChart.options.scales.y.ticks.color = textColor;
  
  mainChart.options.scales.x.title.color = textColor;
  mainChart.options.scales.y.title.color = textColor;
  
  mainChart.options.scales.x.grid.color = gridColors;
  mainChart.options.scales.y.grid.color = gridColor;

  mainChart.update();
}

function drawGivenergyChart(data, flowCol, title) {
  const labels = data.map(d => d.start);

  const gridColors = labels.map((_, i) => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return i % 3 === 0 ? (isDark ? "#444" : "#ccc") : "transparent";
  });

  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const gridColor = isDark ? "#444" : "#ccc";
  const textColor = isDark ? "#ddd" : "#000";

  const dataset = {
    label: title,
    data: data.map(d => d[flowCol]),
    borderColor: "#3498db",
    backgroundColor: "#3498db",
    pointStyle: "rect",
    borderWidth: 1,
    pointRadius: 1,
    pointHoverRadius: 8,
    tension: 0.2,
    fill: false
  };

  const allValues = dataset.data.map(v => Number(v)).filter(v => Number.isFinite(v));
 
  const roundedMax = Math.ceil(Math.max(...allValues) / 5) * 5;
  const roundedMin = Math.floor(Math.min(...allValues) / 5) * 5;

  // ensure there's always a minimum range, if they're equal, add 5 to max
  const yMax = roundedMax === roundedMin ? roundedMin + 5 : roundedMax;
  const yMin = roundedMin;

  givenergyChart.data.labels = labels;
  
  givenergyChart.data.datasets = [dataset];
  
  givenergyChart.options.plugins.title.text = title;
  
  givenergyChart.options.scales.y.min = yMin;
  givenergyChart.options.scales.y.max = yMax;
  
  givenergyChart.options.plugins.legend.labels.color = textColor;
  
  givenergyChart.options.scales.x.ticks.color = textColor;
  givenergyChart.options.scales.y.ticks.color = textColor;
  
  givenergyChart.options.scales.x.title.color = textColor;
  givenergyChart.options.scales.y.title.color = textColor;
  
  givenergyChart.options.scales.x.grid.color = gridColors;
  givenergyChart.options.scales.y.grid.color = gridColor;

  givenergyChart.update();
}
  
function initTabs() {

  // Master tabs
  document.querySelectorAll("#masterTabs .tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("#masterTabs .tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const master = tab.dataset.master;

      if (master === "environment") {
        document.getElementById("envTabs").style.display = "flex";
        document.getElementById("currentTabs").style.display = "none";
        // Trigger the active env sub-tab
        const activeEnv = document.querySelector("#envTabs .tab.active");
        if (activeEnv) activeEnv.click();
      }

      if (master === "current") {
        document.getElementById("envTabs").style.display = "none";
        document.getElementById("currentTabs").style.display = "flex";
        // Trigger the active current sub-tab
        const activeCurrent = document.querySelector("#currentTabs .tab.active");
        if (activeCurrent) activeCurrent.click();
      }
    });
  });

  // Environment sub-tabs
  document.querySelectorAll("#envTabs .tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("#envTabs .tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const type = tab.dataset.type;
      if (type === "temperature") drawChart(allData, tempCols,      "Temperature Sensors",          "Temperature (°C)");
      if (type === "humidity")    drawChart(allData, humCols,       "Humidity Sensors",             "Humidity (%)");
      if (type === "dewpoint")    drawChart(allData, dewCols,       "Dew Point Sensors",            "Dew Point (°C)");
      if (type === "gpkg")        drawChart(allData, gpkgCols,      "Grams per Kilogram Sensors",   "Grams per Kilogram (g/kg)");
      if (type === "heatindex")   drawChart(allData, heatindexCols, "Heat Index Sensors",           "Heat Index (°C)");
      if (type === "wetbulb")     drawChart(allData, wetbulbCols,   "Wet-Bulb Temperature Sensors", "Wet Bulb (°C)");
    });
  });

  // Current sub-tabs
  document.querySelectorAll("#currentTabs .tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("#currentTabs .tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const type = tab.dataset.type;
      if (type === "current-summary")    drawChart(allData, current3Cols,   "Current (Min / Max / Avg)", "Current (A)",    true);
      if (type === "current-cumulative") drawChart(allData, currentcumCols, "Cumulative Current (Ah)",   "Amp-Hours (Ah)", true);
    });
  });
}

  // legend buttons
  document.getElementById("hideAllBtn").onclick = () => {
  mainChart.data.datasets.forEach((_, i) => mainChart.setDatasetVisibility(i, false));
  mainChart.update();
};
document.getElementById("showAllBtn").onclick = () => {
  mainChart.data.datasets.forEach((_, i) => mainChart.setDatasetVisibility(i, true));
  mainChart.update();
};
document.getElementById("invertBtn").onclick = () => {
  mainChart.data.datasets.forEach((_, i) => mainChart.setDatasetVisibility(i, !mainChart.isDatasetVisible(i)));
  mainChart.update();
};
  
async function loadData() {
  const canvas = document.getElementById("mainChart");
  canvas.classList.add("loading");
  showSpinner();

  // Fetch Monnit data
  const response = await fetch("https://monnit-plumber-api.onrender.com/data");
  const data = await response.json();
  allData = data;

  // Fetch givenergy data
  const geResponse = await fetch("https://monnit-plumber-api.onrender.com/givenergy");
  const geData = await geResponse.json();
  givenergyData = geData;
  
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const gridColor = isDark ? "#444" : "#ccc";
  const textColor = isDark ? "#ddd" : "#000";

  const columns = Object.keys(data[0]);

  tempCols       = columns.filter(c => c.toLowerCase().includes("temp"));
  humCols        = columns.filter(c => c.toLowerCase().includes("humid"));
  dewCols        = columns.filter(c => c.toLowerCase().includes("dewpoint"));
  gpkgCols       = columns.filter(c => c.toLowerCase().includes("gpkg"));
  heatindexCols  = columns.filter(c => c.toLowerCase().includes("heat index"));
  wetbulbCols    = columns.filter(c => c.toLowerCase().includes("wet bulb"));
  current3Cols   = columns.filter(c =>
    c.toLowerCase().includes("average current") ||
    c.toLowerCase().includes("maximum current") ||
    c.toLowerCase().includes("minimum current"));
  currentcumCols = columns.filter(c => c.toLowerCase().includes("amp hours"));

  if (!mainChart) {
    const ctx = document.getElementById("mainChart").getContext("2d");
    mainChart = new Chart(ctx, {
      type: "line",
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400, easing: "easeInOutQuart" },
        interaction: { mode: "index", intersect: false },
        elements: {
          point: { pointStyle: "rect", radius: 6, hoverRadius: 6 }
        },
        plugins: {
          legend: {
            position: "right",
            labels: {
              font: { size: 15 },
              color: textColor,
              usePointStyle: true,
              pointStyle: "rect",
              pointStyleWidth: 16,
              generateLabels: function(chart) {
                return chart.data.datasets.map((ds, i) => ({
                  text: ds.label,
                  fillStyle: ds.backgroundColor,
                  strokeStyle: ds.backgroundColor,
                  lineWidth: 0,
                  pointStyle: "rect",
                  fontColor: textColor,
                  hidden: !chart.isDatasetVisible(i),
                  datasetIndex: i
                }));
              }
            }
          },
          tooltip: { enabled: true },
          title: { display: true, text: "", color: textColor, font: { size: 20 }, padding: { bottom: 30 } }
        },
        layout: { padding: { bottom: 20 } },
        scales: {
          x: {
            title: { 
              display: true, 
              text: "Time",
              align: "center", 
              color: textColor, 
              font: { size: 20 } 
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
            title: { display: true, text: "", align: "center", color: textColor, font: { size: 20 } }
          }
        }
      }
    });
  }
  if (!givenergyChart) {
    const ctx3 = document.getElementById("givenergyChart").getContext("2d");
    givenergyChart = new Chart(ctx3, {
      type: "line",
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400, easing: "easeInOutQuart" },
        interaction: { mode: "index", intersect: false },
        elements: { point: { pointStyle: "rect", radius: 6, hoverRadius: 6 } },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
          title: { display: true, text: "", color: textColor, font: { size: 20 }, padding: { bottom: 30 } }
        },
        layout: { padding: { bottom: 20 } },
        scales: {
          x: {
            title: { display: true, text: "Time", align: "center", color: textColor, font: { size: 20 } },
            ticks: {
              color: textColor,
              autoSkip: false,
              callback: function(value, index) {
                if (index % 4 === 0) return this.getLabelForValue(value);
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
            title: { display: true, text: "kW", align: "center", color: textColor, font: { size: 20 } }
          }
        }
      }
    });
  }
  if (!window.givenergyTabsInitialised) {
    window.givenergyTabsInitialised = true;
    document.querySelectorAll("#givenergyTabs .tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("#givenergyTabs .tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const flow = tab.dataset.flow;
        if (flow === "pv-home")       drawGivenergyChart(givenergyData, "PV to Home",       "PV to Home");
        if (flow === "pv-battery")    drawGivenergyChart(givenergyData, "PV to Battery",    "PV to Battery");
        if (flow === "pv-grid")       drawGivenergyChart(givenergyData, "PV to Grid",       "PV to Grid");
        if (flow === "grid-home")     drawGivenergyChart(givenergyData, "Grid to Home",     "Grid to Home");
        if (flow === "grid-battery")  drawGivenergyChart(givenergyData, "Grid to Battery",  "Grid to Battery");
        if (flow === "battery-home")  drawGivenergyChart(givenergyData, "Battery to Home",  "Battery to Home");
        if (flow === "battery-grid")  drawGivenergyChart(givenergyData, "Battery to Grid",  "Battery to Grid");
      });
    });
  }
  // Draw default tab
  drawGivenergyChart(givenergyData, "PV to Home", "PV to Home");
  
  if (!window.tabsInitialised) {
  window.tabsInitialised = true;
  initTabs();
  }
  
  // Draw the currently active tab on refresh
  const activeMaster = document.querySelector("#masterTabs .tab.active");
  if (activeMaster && activeMaster.dataset.master === "current") {
    const activeSub = document.querySelector("#currentTabs .tab.active");
    if (activeSub) activeSub.click();
  } else {
    const activeSub = document.querySelector("#envTabs .tab.active");
    if (activeSub) activeSub.click();
  }

  hideSpinner();
  canvas.classList.remove("loading");
}

loadData();
  
setInterval(loadData, 10 * 60 * 1000);
  
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { loadData(); });

}); // end DOMContentLoaded
