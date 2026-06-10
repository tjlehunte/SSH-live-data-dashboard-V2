// Wait for the DOM to fully load before executing any code
document.addEventListener("DOMContentLoaded", () => {

  // ==================== CHART VARIABLES ====================
  let mainChart = null;           // Main chart for displaying sensor data
  let givenergyChart = null;      // Chart for displaying GiveEnergy data
  
  // Arrays to store column names for different sensor types
  let tempCols = [];              // Temperature sensor columns
  let humCols = [];               // Humidity sensor columns
  let dewCols = [];               // Dew point sensor columns
  let gpkgCols = [];              // Grams per kilogram sensor columns
  let heatindexCols = [];         // Heat index sensor columns
  let wetbulbCols = [];           // Wet bulb temperature sensor columns
  let current3Cols = [];          // Current (min/max/avg) sensor columns
  let currentcumCols = [];        // Cumulative current (amp-hours) columns
  
  // Data storage arrays
  let allData = []; // All fetched Monnit sensor data
  let givenergyData = []; // All fetched GiveEnergy data
  
  // ==================== SPINNER DISPLAY FUNCTIONS ====================
  function showSpinner() {
    document.getElementById("spinner").style.display = "block";
  }
  
  function hideSpinner() {
    document.getElementById("spinner").style.display = "none";
  }

  function showGivenergySpinner() {
    document.getElementById("givenergySpinner").style.display = "block";
  }
  
  function hideGivenergySpinner() {
    document.getElementById("givenergySpinner").style.display = "none";
  }

  function formatMobileTick(rawLabel) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const date = new Date(rawLabel.replace(" ", "T"));
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, "0");
  const mins = String(date.getMinutes()).padStart(2, "0");
  return [`${day} ${month}`, `${hours}:${mins}`];
}
  
  // ==================== COLOR CONFIGURATION ====================
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

  // ==================== MAIN CHART DRAWING FUNCTION ====================
  function drawChart(data, cols, title, unit, isCurrentChart = false) {
    
    mainChart.options.plugins.legend.display = true;
    
    // Always re-assert the correct Monnit tick callback (GivEnergy interval is different)
    mainChart.options.scales.x.ticks.callback = function(value, index) {
      const interval = window.innerWidth <= 768 ? 36 : 12;
      if (index % interval === 0) {
        const raw = this.getLabelForValue(value);
        return window.innerWidth <= 768 ? formatMobileTick(raw) : raw;
      }
      return "";
    };
      
    const labels = data.map(d => d.MessageDate || d.start);
    const gridColors = labels.map((_, i) => {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (i % 12 === 0) return isDark ? "#444" : "#ccc";
      return isDark ? "#2a2a2a" : "#ebebeb";
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
    const allValues = datasets.flatMap(ds => ds.data).map(v => Number(v)).filter(v => Number.isFinite(v));
    const roundedMax = Math.ceil(Math.max(...allValues) / 5) * 5;
    const roundedMin = Math.floor(Math.min(...allValues) / 5) * 5;

    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const gridColor = isDark ? "#444" : "#ccc";
    const textColor = isDark ? "#ddd" : "#000";

    mainChart.data.labels = labels;
    mainChart.data.datasets = datasets;
    mainChart.options.plugins.title.text = title;
    mainChart.options.plugins.title.color = textColor;
    mainChart.options.scales.y.title.text = unit;
    mainChart.options.scales.y.min = roundedMin;
    mainChart.options.scales.y.max = roundedMax;
    // Dynamically change legend position based on 768px breakpoint
    mainChart.options.plugins.legend.position = (window.innerWidth <= 768) ? "bottom" : "right";

    mainChart.options.plugins.legend.labels.generateLabels = function(chart) {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const tc = isDark ? "#ddd" : "#000";
      return chart.data.datasets.map((ds, i) => ({
        text: ds.label,
        fillStyle: ds.backgroundColor,
        strokeStyle: ds.backgroundColor,
        lineWidth: 0,
        pointStyle: "rect",
        fontColor: tc,
        hidden: !chart.isDatasetVisible(i),
        datasetIndex: i
      }));
    };
    mainChart.options.plugins.legend.labels.color = textColor;
    
    mainChart.options.scales.x.ticks.color = textColor;
    mainChart.options.scales.y.ticks.color = textColor;
    mainChart.options.scales.x.title.color = textColor;
    mainChart.options.scales.y.title.color = textColor;
    mainChart.options.scales.x.grid.color = gridColors;
    mainChart.options.scales.y.grid.color = gridColor;

    mainChart.update();
  }
// ==================== GIVENERGY CHART DRAWING FUNCTION ====================
  function drawGivenergyChart(data, flowCol, title) {
    const labels = data.map(d => d.start);
    const isMobile = window.innerWidth <= 768;
    
    const gridColors = labels.map((_, i) => {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      // Adjust alternating background lines based on viewports
      const interval = isMobile ? 12 : 4;
      if (i % interval === 0) return isDark ? "#444" : "#ccc";
      return isDark ? "#2a2a2a" : "#ebebeb";
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
    const yMax = roundedMax === roundedMin ? roundedMin + 5 : roundedMax;
    const yMin = roundedMin;

    givenergyChart.data.labels = labels;
    givenergyChart.data.datasets = [dataset];
    givenergyChart.options.plugins.title.text = title;
    givenergyChart.options.plugins.title.color = textColor;
    givenergyChart.options.scales.y.min = yMin;
    givenergyChart.options.scales.y.max = yMax;

    // --- FIX: ENFORCE LEGEND HIDING ---
    // We explicitly configure the display boolean directly to the active configuration reference
    if (!givenergyChart.options.plugins.legend) {
      givenergyChart.options.plugins.legend = {};
    }
    // Hide the line item legends on mobile since the large header title already states the metrics
    givenergyChart.options.plugins.legend.display = false;
    givenergyChart.options.plugins.legend.position = isMobile ? "bottom" : "right";
    givenergyChart.options.plugins.legend.labels.color = textColor;

    // FIX: Force update the Y-axis label dynamically (otherwise it retains the old Monnit metric text)
    givenergyChart.options.scales.y.title.text = "Energy (kWh)";

    givenergyChart.options.scales.x.ticks.color = textColor;
    givenergyChart.options.scales.y.ticks.color = textColor;
    givenergyChart.options.scales.x.title.color = textColor;
    givenergyChart.options.scales.y.title.color = textColor;
    givenergyChart.options.scales.x.grid.color = gridColors;
    givenergyChart.options.scales.y.grid.color = gridColor;

    // FIX: Re-bind the correct mobile time interval loop directly to the current runtime target
    givenergyChart.options.scales.x.ticks.callback = function(value, index) {
      const interval = isMobile ? 12 : 4;
      if (index % interval === 0) {
        const raw = this.getLabelForValue(value);
        return isMobile ? formatMobileTick(raw) : raw;
      }
      return "";
    };

    givenergyChart.update();
  }

  // ==================== HELPER FUNCTION TO RESTORE GIVENERGY TO ORIGINAL SECTION ====================
function restoreGivEnergyToSection() {
  const givWrapper = document.getElementById("givenergy-chart-wrapper");
  const givTabs = document.getElementById("givenergyTabs");
  const givSection = document.querySelector(".givenergy-section");

  if (givWrapper && givWrapper.parentElement !== givSection) {
    givSection.appendChild(givTabs);
    givSection.appendChild(givWrapper);
    givWrapper.style.display = window.innerWidth <= 768 ? "none" : "block";
    givTabs.style.display = window.innerWidth <= 768 ? "none" : "flex";
  }
}

  // ==================== TAB INITIALIZATION FUNCTION ====================
  function initTabs() {

    // ===== MASTER TABS (Environment vs Current vs GivEnergy) =====
    document.querySelectorAll("#masterTabs .tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("#masterTabs .tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const master = tab.dataset.master;

        // --- Environment Selection ---
        if (master === "environment") {
          restoreGivEnergyToSection();
          document.getElementById("envTabs").style.display = "flex";
          document.getElementById("currentTabs").style.display = "none";
          document.getElementById("givenergyTabs").style.display = "none";

          // RESTORE BUTTONS: Show the legend control strip for Monnit datasets
          // Ensure main chart legend turns back on when returning to Monnit data
          if (mainChart) {
            mainChart.options.plugins.legend.display = true;
          }
          
          if (document.querySelector(".legend-controls")) {
            document.querySelector(".legend-controls").style.display = "";
          }
          
          // Re-evaluate GivEnergy structural element states based on layout context
          document.getElementById("givenergyTabs").style.display = (window.innerWidth <= 768) ? "none" : "flex";
          const givWrapper = document.getElementById("givenergy-chart-wrapper");
          if (givWrapper) {
            givWrapper.style.display = (window.innerWidth <= 768) ? "none" : "block";
          }

          const activeEnv = document.querySelector("#envTabs .tab.active");
          if (activeEnv) activeEnv.click();
        }

        // --- Current Selection ---
        if (master === "current") {
          restoreGivEnergyToSection();
          document.getElementById("envTabs").style.display = "none";
          document.getElementById("currentTabs").style.display = "flex";
          document.getElementById("givenergyTabs").style.display = "none";

          // RESTORE BUTTONS: Show the legend control strip for Monnit datasets
          if (mainChart) {
            mainChart.options.plugins.legend.display = true;
          }
          
          if (document.querySelector(".legend-controls")) {
            document.querySelector(".legend-controls").style.display = "";
          }
          
          // Re-evaluate GivEnergy structural element states based on layout context
          document.getElementById("givenergyTabs").style.display = (window.innerWidth <= 768) ? "none" : "flex";
          const givWrapper = document.getElementById("givenergy-chart-wrapper");
          if (givWrapper) {
            givWrapper.style.display = (window.innerWidth <= 768) ? "none" : "block";
          }

          const activeCurrent = document.querySelector("#currentTabs .tab.active");
          if (activeCurrent) activeCurrent.click();
        }

        // --- GivEnergy Selection (Mobile Context Only) ---
        if (master === "givenergy") {
          document.getElementById("envTabs").style.display = "none";
          document.getElementById("currentTabs").style.display = "none";
          
          // Hide the desktop utility buttons since they don't apply to a single data line
          if (document.querySelector(".legend-controls")) {
            document.querySelector(".legend-controls").style.display = "none";
          }
                  
          const givTabs = document.getElementById("givenergyTabs");
          const chartSection = document.querySelector(".chart-section");
          givTabs.style.display = "flex";
          
          // Move sub-tabs right above the main chart container
          chartSection.insertBefore(givTabs, document.querySelector(".chart-section .chart-container"));

          const firstGeTab = document.querySelector("#givenergyTabs .tab:first-child");
          if (firstGeTab) firstGeTab.click();
        }
      });
    });

    // ===== ENVIRONMENT SUB-TABS =====
    document.querySelectorAll("#envTabs .tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("#envTabs .tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const type = tab.dataset.type;
        if (type === "temperature") drawChart(allData, tempCols,      "Temperature Sensors",          "Temperature (°C)");
        if (type === "humidity")    drawChart(allData, humCols,        "Humidity Sensors",             "Humidity (%)");
        if (type === "dewpoint")    drawChart(allData, dewCols,       "Dew Point Sensors",            "Dew Point (°C)");
        if (type === "gpkg")        drawChart(allData, gpkgCols,      "Grams per Kilogram Sensors",   "Grams per Kilogram (g/kg)");
        if (type === "heatindex")   drawChart(allData, heatindexCols, "Heat Index Sensors",           "Heat Index (°C)");
        if (type === "wetbulb")     drawChart(allData, wetbulbCols,   "Wet-Bulb Temperature Sensors", "Wet Bulb (°C)");
      });
    });

    // ===== CURRENT SUB-TABS =====
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

  // ==================== LEGEND CONTROL BUTTONS ====================
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

  // ==================== FETCH WITH RETRY LOGIC ====================
  async function fetchWithRetry(url, retries = 3, delay = 5000) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) return await response.json();
      } catch (e) {
        if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
      }
    }
    throw new Error("Failed to fetch after 3 retries");
  }

  // ==================== MAIN DATA LOADING FUNCTION ====================
  async function loadData() {
    const canvas = document.getElementById("mainChart");
    const givenergyCanvas = document.getElementById("givenergyChart");
    
    canvas.classList.add("loading");
    givenergyCanvas.classList.add("loading");
    showSpinner();
    showGivenergySpinner();

    allData = await fetchWithRetry("https://monnit-plumber-api.onrender.com/data");
    givenergyData = await fetchWithRetry("https://monnit-plumber-api.onrender.com/givenergy");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const gridColor = isDark ? "#444" : "#ccc";
    const textColor = isDark ? "#ddd" : "#000";

    const columns = Object.keys(allData[0]);
    tempCols = columns.filter(c => c.toLowerCase().includes("temp"));
    humCols = columns.filter(c => c.toLowerCase().includes("humid"));
    dewCols = columns.filter(c => c.toLowerCase().includes("dewpoint"));
    gpkgCols = columns.filter(c => c.toLowerCase().includes("gpkg"));
    heatindexCols = columns.filter(c => c.toLowerCase().includes("heat index"));
    wetbulbCols = columns.filter(c => c.toLowerCase().includes("wet bulb"));
    current3Cols = columns.filter(c => c.toLowerCase().includes("current") && !c.toLowerCase().includes("cum"));
    currentcumCols = columns.filter(c => c.toLowerCase().includes("current") && c.toLowerCase().includes("cum"));

    // ===== INITIALIZE MAIN CHART =====
    if (!mainChart) {
      const ctx = canvas.getContext("2d");
      mainChart = new Chart(ctx, {
        type: "line",
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400, easing: "easeInOutQuart" },
          interaction: { mode: "index", intersect: false },
          elements: { point: { pointStyle: "rect", hoverRadius: 8 } },
          plugins: {
            legend: {
              position: (window.innerWidth <= 768) ? "bottom" : "right",
              labels: { font: { size: 15 }, color: textColor, usePointStyle: true, pointStyle: "rect", pointStyleWidth: 16 }
            },
            tooltip: { enabled: true },
            title: { 
              display: true, 
              text: "", 
              color: textColor, 
              // REDUCE TITLE SIZE ON MOBILE
              font: { size: window.innerWidth <= 768 ? 16 : 20 }, 
              // REDUCE SPACE BETWEEN GRAPH AND TITLE ON MOBILE
              padding: { bottom: window.innerWidth <= 768 ? 10 : 30 }
            }
          },
          layout: { padding: { bottom: window.innerWidth <= 768 ? 5 : 20 } },
          scales: {
            x: {
              title: { 
                display: true, 
                text: "Time", // (or "" for Y axis)
                align: "center", 
                color: textColor, 
                // REDUCE AXIS TITLE SIZES ON MOBILE
                font: { size: window.innerWidth <= 768 ? 14 : 20 }  
              },
              ticks: {
                color: textColor,
                  maxRotation: window.innerWidth <= 768 ? 0 : 50,
                  minRotation: 0,
                autoSkip: false,
                callback: function(value, index) {
                  const interval = window.innerWidth <= 768 ? 36 : 12;
                  if (index % interval === 0) {
                    const raw = this.getLabelForValue(value);
                    return window.innerWidth <= 768 ? formatMobileTick(raw) : raw;
                  }
                  return "";
                }
              },
              grid: {}
            },
            y: { min: 0, 
                max: 1, 
                ticks: { 
                  color: textColor 
                }, 
                grid: { 
                  color: gridColor 
                }, 
                title: { 
                  display: true, 
                  text: "", // (or "" for Y axis)
                  align: "center", 
                  color: textColor, 
                  // REDUCE AXIS TITLE SIZES ON MOBILE
                  font: { size: window.innerWidth <= 768 ? 14 : 20 } 
                }
               }
          }
        }
      });
    }

    // ===== INITIALIZE GIVENENERGY CHART =====
    if (!givenergyChart) {
      const ctx3 = givenergyCanvas.getContext("2d");
      givenergyChart = new Chart(ctx3, {
        type: "line",
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400, easing: "easeInOutQuart" },
          interaction: { mode: "index", intersect: false },
          elements: { point: { pointStyle: "rect", hoverRadius: 8 } },
          plugins: {
            legend: {
              display: false,
              position: (window.innerWidth <= 768) ? "bottom" : "right",
              labels: { font: { size: 15 }, color: textColor, usePointStyle: true, pointStyle: "rect", pointStyleWidth: 16 }
            },
            tooltip: { enabled: true },
            title: { 
              display: true, 
              text: "", 
              color: textColor, 
              // REDUCE TITLE SIZE ON MOBILE
              font: { size: window.innerWidth <= 768 ? 16 : 20 }, 
              // REDUCE SPACE BETWEEN GRAPH AND TITLE ON MOBILE
              padding: { bottom: window.innerWidth <= 768 ? 10 : 30 } 
            }
          },
          layout: { padding: { bottom: 20 } },
          scales: {
            x: {
              title: { 
                display: true, 
                text: "Time", // (or "" for Y axis)
                align: "center", 
                color: textColor, 
                // REDUCE AXIS TITLE SIZES ON MOBILE
                font: { size: window.innerWidth <= 768 ? 14 : 20 } },
                ticks: {
                color: textColor,
                maxRotation: window.innerWidth <= 768 ? 0 : 50,
                minRotation: 0,
                autoSkip: false,
                callback: function(value, index) {
                  const interval = window.innerWidth <= 768 ? 12 : 4;
                  if (index % interval === 0) {
                    const raw = this.getLabelForValue(value);
                    return window.innerWidth <= 768 ? formatMobileTick(raw) : raw;
                  }
                  return "";
                }
              },
              grid: { color: isDark ? "#444" : "#ccc" }
            },
            y: { 
              min: 0, 
              max: 1, 
              ticks: { 
                color: textColor 
              }, 
              grid: { 
                color: gridColor 
              }, 
              title: { 
                display: true, 
                text: "Energy (kWh)", // (or "" for Y axis)
                align: "center", 
                color: textColor, 
                // REDUCE AXIS TITLE SIZES ON MOBILE
                font: { size: window.innerWidth <= 768 ? 14 : 20 } 
              } 
            }
          }
        }
      });
    }if (!window.givenergyTabsInitialised) {
      window.givenergyTabsInitialised = true;
      document.querySelectorAll("#givenergyTabs .tab").forEach(tab => {
        tab.addEventListener("click", () => {
          document.querySelectorAll("#givenergyTabs .tab").forEach(t => t.classList.remove("active"));
          tab.classList.add("active");
          
          const flow = tab.dataset.flow;

          // Swap the underlying chart instance target based on screen size
          // If mobile, temporarily point the drawing engine to mainChart!
          const originalGivChart = givenergyChart;
          if (window.innerWidth <= 768) {
            givenergyChart = mainChart; 
          }

          // Run your original, perfectly working drawing functions
          if (flow === "pv-home")       drawGivenergyChart(givenergyData, "PV to Home",      "PV to Home");
          if (flow === "pv-battery")    drawGivenergyChart(givenergyData, "PV to Battery",   "PV to Battery");
          if (flow === "pv-grid")       drawGivenergyChart(givenergyData, "PV to Grid",      "PV to Grid");
          if (flow === "grid-home")     drawGivenergyChart(givenergyData, "Grid to Home",    "Grid to Home");
          if (flow === "grid-battery")  drawGivenergyChart(givenergyData, "Grid to Battery", "Grid to Battery");
          if (flow === "battery-home")  drawGivenergyChart(givenergyData, "Battery to Home", "Battery to Home");
          if (flow === "battery-grid")  drawGivenergyChart(givenergyData, "Battery to Grid", "Battery to Grid");

          // Restore the desktop target reference immediately afterward
          givenergyChart = originalGivChart;
        });
      });
    }

    const activeGe = document.querySelector("#givenergyTabs .tab.active");
    if (activeGe) {
      activeGe.click();
    }
    
    if (!window.tabsInitialised) {
      window.tabsInitialised = true;
      initTabs();
    }

    if (!window.touchDismissInitialised) {
      window.touchDismissInitialised = true;
  
      document.addEventListener("touchstart", (e) => {
      const mainCanvas = document.getElementById("mainChart");
      const givCanvas = document.getElementById("givenergyChart");
    
      if (e.target !== mainCanvas && e.target !== givCanvas) {
        if (mainChart) {
          mainChart.tooltip.setActiveElements([], { x: 0, y: 0 });
          mainChart.update();
        }
        if (givenergyChart) {
          givenergyChart.tooltip.setActiveElements([], { x: 0, y: 0 });
          givenergyChart.update();
        }
      }
      });
    }
    
    const activeMaster = document.querySelector("#masterTabs .tab.active");
    if (activeMaster && activeMaster.dataset.master === "current") {
      const activeSub = document.querySelector("#currentTabs .tab.active");
      if (activeSub) activeSub.click();
    } else {
      const activeSub = document.querySelector("#envTabs .tab.active");
      if (activeSub) activeSub.click();
    }

    // Set initial layout visibility states on mobile screens
    // ===== FIX: Set initial layout visibility states explicitly for both mobile and desktop =====
    if (window.innerWidth <= 768) {
      document.getElementById("givenergyTabs").style.display = "none";
      const givWrapper = document.getElementById("givenergy-chart-wrapper");
      if (givWrapper) givWrapper.style.display = "none";
    } else {
      // On desktop load, ensure the GivEnergy sub-tabs are displayed seamlessly
      document.getElementById("givenergyTabs").style.display = "flex";
      const givWrapper = document.getElementById("givenergy-chart-wrapper");
      if (givWrapper) givWrapper.style.display = "block";
    }
    
    const lastMonnit = allData[allData.length - 1].MessageDate;
    const lastGivenergy = givenergyData[givenergyData.length - 1].start;
    
    // Take whichever is more recent
    const lastTimestamp = lastMonnit > lastGivenergy ? lastMonnit : lastGivenergy;
    document.getElementById("lastUpdated").textContent = `Last updated: ${lastTimestamp}`;
    
    hideSpinner();
    hideGivenergySpinner();
    
    canvas.classList.remove("loading");
    givenergyCanvas.classList.remove("loading");
  }

// ==================== LIVE WINDOW RESIZE LISTENER ====================
  window.addEventListener("resize", () => {
    const isMobile = window.innerWidth <= 768;
    const activeMasterTab = document.querySelector("#masterTabs .tab.active");
    if (!activeMasterTab) return;
    const activeMaster = activeMasterTab.dataset.master;

    // Redraw and shift legend positions actively during desktop/mobile resizing
    if (mainChart) {
      mainChart.options.plugins.legend.position = isMobile ? "bottom" : "right";
      mainChart.update();
    }
    if (givenergyChart) {
      givenergyChart.options.plugins.legend.position = isMobile ? "bottom" : "right";
      givenergyChart.update();
    }

    // Sync structural visibility components instantly without moving chart elements around
    if (isMobile) {
      if (activeMaster === "givenergy") {
        document.getElementById("envTabs").style.display = "none";
        document.getElementById("currentTabs").style.display = "none";
        document.getElementById("givenergyTabs").style.display = "flex";
        
      } else {
        document.getElementById("givenergyTabs").style.display = "none";
        restoreGivEnergyToSection();
        
        if (activeMaster === "environment") {
          document.getElementById("envTabs").style.display = "flex";
          document.getElementById("currentTabs").style.display = "none";
        } else {
          document.getElementById("envTabs").style.display = "none";
          document.getElementById("currentTabs").style.display = "flex";
        }
      }
    } else {
      // Revert cleanly to original desktop layout constraints if window is widened
      restoreGivEnergyToSection();
      document.getElementById("givenergyTabs").style.display = "flex";
      
      if (activeMaster === "givenergy") {
        // Desktop doesn't use GivEnergy in the master block, default back to environment view
        document.querySelector("#masterTabs .tab[data-master='environment']").click();
      } else if (activeMaster === "environment") {
        document.getElementById("envTabs").style.display = "flex";
        document.getElementById("currentTabs").style.display = "none";
      } else {
        document.getElementById("envTabs").style.display = "none";
        document.getElementById("currentTabs").style.display = "flex";
      }
    }
  });

  // ==================== LIVE THEME SWITCH LISTENER ====================
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    const isDark = e.matches;
    const textColor = isDark ? "#ddd" : "#000";
    const gridColor = isDark ? "#444" : "#ccc";

    // 1. Update Main Chart Core Theme Styling
    if (mainChart) {
      mainChart.options.plugins.title.color = textColor;
      mainChart.options.plugins.legend.labels.color = textColor;
      mainChart.options.scales.x.ticks.color = textColor;
      mainChart.options.scales.y.ticks.color = textColor;
      mainChart.options.scales.x.title.color = textColor;
      mainChart.options.scales.y.title.color = textColor;
      mainChart.options.scales.y.grid.color = gridColor;
      
      // Recalculate alternating grid colors for X axis if data exists
      if (mainChart.data.labels.length > 0) {
        mainChart.options.scales.x.grid.color = mainChart.data.labels.map((_, i) => {
          if (i % 12 === 0) return isDark ? "#444" : "#ccc";
          return isDark ? "#2a2a2a" : "#ebebeb";
        });
      }
      
      mainChart.update();
    }

    // 2. Update GivEnergy Chart Core Theme Styling
    if (givenergyChart) {
      givenergyChart.options.plugins.title.color = textColor;
      givenergyChart.options.plugins.legend.labels.color = textColor;
      givenergyChart.options.scales.x.ticks.color = textColor;
      givenergyChart.options.scales.y.ticks.color = textColor;
      givenergyChart.options.scales.x.title.color = textColor;
      givenergyChart.options.scales.y.title.color = textColor;
      givenergyChart.options.scales.y.grid.color = gridColor;
      
      // Recalculate alternating grid colors for GivEnergy X axis
      if (givenergyChart.data.labels.length > 0) {
        givenergyChart.options.scales.x.grid.color = givenergyChart.data.labels.map((_, i) => {
          if (i % 4 === 0) return isDark ? "#444" : "#ccc";
          return isDark ? "#2a2a2a" : "#ebebeb";
        });
      }
      
      givenergyChart.update();
    }
  });
  
  loadData();
});
