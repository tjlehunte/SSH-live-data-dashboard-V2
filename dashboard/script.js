let chart;

async function loadData() {
  const response = await fetch("https://monnit-plumber-api.onrender.com/data");
  const data = await response.json();

  // Extract column names
  const columns = Object.keys(data[0]).filter(c => c !== "MessageDate");

  // Populate dropdown
  const select = document.getElementById("columnSelect");
  columns.forEach(col => {
    const option = document.createElement("option");
    option.value = col;
    option.textContent = col;
    select.appendChild(option);
  });

  // Draw initial chart
  drawChart(data, columns[0]);

  // Update chart when dropdown changes
  select.addEventListener("change", () => {
    drawChart(data, select.value);
  });
}

function drawChart(data, column) {
  const labels = data.map(d => d.MessageDate);
  const values = data.map(d => d[column]);

  const ctx = document.getElementById("chart").getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: column,
        data: values,
        borderColor: "blue",
        fill: false,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: { enabled: true }
      },
      scales: {
        x: { display: true },
        y: { display: true }
      }
    }
  });
}

loadData();
