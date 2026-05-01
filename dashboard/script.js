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

function colorFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

function drawMainChart(data, cols, title) {
  const labels = data.map(d => d.MessageDate);

  const datasets = cols.map(col => {
    const color = colorFromString(col);
    return {
      label: shortenLabel(col),
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
