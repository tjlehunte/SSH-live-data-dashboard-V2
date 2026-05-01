let tempChart, humChart;

async function loadData() {
  showSpinner();

  const response = await fetch("https://monnit-plumber-api.onrender.com/data");
  const data = await response.json();

  const columns = Object.keys(data[0]);

  const tempCols = columns.filter(c =>
    c.toLowerCase().includes("temp")
  );

  const humCols = columns.filter(c =>
    c.toLowerCase().includes("humid")
  );

  drawTemperatureChart(data, tempCols);
  drawHumidityChart(data, humCols);

  hideSpinner();
}

function shortenLabel(col) {
  // Split on " - " and return only the room name
  return col.split(" - ")[0];
}

function drawTemperatureChart(data, tempCols) {
  const labels = data.map(d => d.MessageDate);

  const datasets = tempCols.map(col => ({
    label: shortenLabel(col),
    data: data.map(d => d[col]),
    borderColor: randomColor(),
    borderWidth: 1,
    pointRadius: 1,
    pointHoverRadius: 4,
    pointBorderWidth: 0.5,
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
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "right" },
        tooltip: { enabled: true }
      }
    }
  });
}

function drawHumidityChart(data, humCols) {
  const labels = data.map(d => d.MessageDate);

const datasets = humCols.map(col => ({
  label: shortenLabel(col),
  data: data.map(d => d[col]),
  borderColor: randomColor(),
  borderWidth: 1,
  pointRadius: 1,        // smaller visible points
  pointHoverRadius: 4,   // bigger on hover so tooltips still work
  pointBorderWidth: 0.5, // thin outline
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
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom" },
      tooltip: { enabled: true }
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

// Auto-refresh every minute
setInterval(loadData, 10 * 60 * 1000);
