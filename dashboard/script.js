let tempChart, humChart;

async function loadData() {
  const response = await fetch("https://monnit-plumber-api.onrender.com/data");
  const data = await response.json();

  const columns = Object.keys(data[0]);

  // Identify temperature and humidity columns
  const tempCols = columns.filter(c =>
    c.toLowerCase().includes("temp") || c.toLowerCase().includes("temperature")
  );

  const humCols = columns.filter(c =>
    c.toLowerCase().includes("humid")
  );

  drawTemperatureChart(data, tempCols);
  drawHumidityChart(data, humCols);
}

function drawTemperatureChart(data, tempCols) {
  const labels = data.map(d => d.MessageDate);

  const datasets = tempCols.map(col => ({
    label: col,
    data: data.map(d => d[col]),
    borderWidth: 2,
    borderColor: randomColor(),
    fill: false,
    tension: 0.2
  }));

  const ctx = document.getElementById("tempChart").getContext("2d");

  if (tempChart) tempChart.destroy();

  tempChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        tooltip: { enabled: true }
      }
    }
  });
}

function drawHumidityChart(data, humCols) {
  const labels = data.map(d => d.MessageDate);

  const datasets = humCols.map(col => ({
    label: col,
    data: data.map(d => d[col]),
    borderWidth: 2,
    borderColor: randomColor(),
    fill: false,
    tension: 0.2
  }));

  const ctx = document.getElementById("humChart").getContext("2d");

  if (humChart) humChart.destroy();

  humChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        tooltip: { enabled: true }
      }
    }
  });
}

// Random colour generator for multiple lines
function randomColor() {
  return `hsl(${Math.random() * 360}, 70%, 50%)`;
}

loadData();
setInterval(loadData, 10 * 60 * 1000);   // refresh every 10 minutes
