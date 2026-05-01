async function loadData() {
  const response = await fetch("https://monnit-plumber-api.onrender.com/data");
  const data = await response.json();

  // Example: assume your data has timestamp + value
  const labels = data.map(d => d.timestamp);
  const values = data.map(d => d.value);

  const ctx = document.getElementById("chart").getContext("2d");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Sensor Value",
        data: values,
        borderColor: "blue",
        fill: false,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          enabled: true
        }
      },
      scales: {
        x: { display: true },
        y: { display: true }
      }
    }
  });
}

loadData();
