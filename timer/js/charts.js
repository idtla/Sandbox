(() => {
  const { loadStore } = window.TimerData;
  const store = loadStore();
  let charts = [];

  const synced = store.syncedDays || {};

  const getDailySeries = () => {
    const labels = Object.keys(synced).sort().slice(-14);
    const datasets = store.projects.map((p) => ({
      label: p.name,
      borderColor: p.bgA,
      backgroundColor: p.bgA,
      tension: 0.25,
      fill: false,
      data: labels.map((d) => ((synced[d]?.projects?.[p.id]?.workMs || 0) / 3600000))
    }));

    datasets.push({
      label: "Break global",
      borderColor: "#f59e0b",
      backgroundColor: "#f59e0b",
      tension: 0.25,
      fill: false,
      data: labels.map((d) => ((synced[d]?.breakMs || 0) / 3600000))
    });

    datasets.push({
      label: "Total día (proyectos + break)",
      borderColor: "#ffffff",
      backgroundColor: "#ffffff",
      borderDash: [4, 4],
      tension: 0.25,
      fill: false,
      data: labels.map((d) => {
        const work = Object.values(synced[d]?.projects || {}).reduce((acc, p) => acc + (p.workMs || 0), 0);
        return (work + (synced[d]?.breakMs || 0)) / 3600000;
      })
    });

    return { labels, datasets };
  };

  const aggregate = (formatter, take = 8) => {
    const map = {};
    Object.entries(synced).forEach(([date, day]) => {
      const key = formatter(new Date(date));
      const work = Object.values(day.projects || {}).reduce((acc, p) => acc + (p.workMs || 0), 0);
      const total = work + (day.breakMs || 0);
      map[key] = (map[key] || 0) + total / 3600000;
    });
    const labels = Object.keys(map).sort().slice(-take);
    return { labels, values: labels.map((k) => map[k]) };
  };

  const latestDayBreakVsWork = () => {
    const latest = Object.keys(synced).sort().at(-1);
    if (!latest) return { label: "Sin datos", work: 0, breakMs: 0 };
    const day = synced[latest];
    const work = Object.values(day.projects || {}).reduce((acc, p) => acc + (p.workMs || 0), 0);
    return { label: latest, work, breakMs: day.breakMs || 0 };
  };

  const latestDayProjectPie = () => {
    const latest = Object.keys(synced).sort().at(-1);
    if (!latest) return { label: "Sin datos", labels: [], values: [] };
    const day = synced[latest];
    const labels = [];
    const values = [];
    store.projects.forEach((p) => {
      const ms = day.projects?.[p.id]?.workMs || 0;
      if (ms > 0) {
        labels.push(p.name);
        values.push(ms / 3600000);
      }
    });
    if ((day.breakMs || 0) > 0) {
      labels.push("Break global");
      values.push(day.breakMs / 3600000);
    }
    return { label: latest, labels, values };
  };

  const create = (id, type, data, options = {}) => new Chart(document.getElementById(id), {
    type,
    data,
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "white" } } },
      scales: type === "pie" ? {} : { x: { ticks: { color: "white" } }, y: { ticks: { color: "white" } } },
      ...options
    }
  });

  const render = () => {
    charts.forEach((c) => c.destroy());
    charts = [];

    const lineData = getDailySeries();
    charts.push(create("dailyLineChart", "line", { labels: lineData.labels, datasets: lineData.datasets }));

    const week = aggregate((d) => `${d.getFullYear()}-W${String(Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1) / 7)).padStart(2, "0")}`, 8);
    charts.push(create("weekChart", "bar", { labels: week.labels, datasets: [{ label: "Total horas/semana", data: week.values, backgroundColor: "#60a5fa" }] }));

    const month = aggregate((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 6);
    charts.push(create("monthChart", "bar", { labels: month.labels, datasets: [{ label: "Total horas/mes", data: month.values, backgroundColor: "#34d399" }] }));

    const bw = latestDayBreakVsWork();
    charts.push(create("breakWorkPie", "pie", {
      labels: ["Work", "Break"],
      datasets: [{ data: [bw.work / 3600000, bw.breakMs / 3600000], backgroundColor: ["#60a5fa", "#f59e0b"] }]
    }));

    const proj = latestDayProjectPie();
    charts.push(create("projectPie", "pie", {
      labels: proj.labels,
      datasets: [{ data: proj.values, backgroundColor: ["#4bbcee", "#00a632", "#2a9d8f", "#f59e0b", "#c084fc", "#fb7185"] }]
    }));
  };

  document.getElementById("refreshCharts").addEventListener("click", render);
  render();
})();
