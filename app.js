const DEFAULT_STATE = {
  companyName: "Example Co",
  currency: "USD",
  projectionYears: 5,
  assumptions: {
    wacc: { value: 10.0, comment: "", explanation: "" },
    terminalGrowth: { value: 2.5, comment: "" },
    taxRate: { value: 25.0, comment: "" },
    sharesOutstanding: { value: 100.0, comment: "" },
    netDebt: { value: 150.0, comment: "" },
    peMultiple: { value: 12.0, comment: "" }
  },
  drivers: {
    revenue: {
      label: "Revenue",
      baseValue: 1000,
      mode: "trend",
      trendValues: [10, 9, 8, 7, 6],
      manualValues: [1100, 1199, 1295, 1386, 1469],
      comment: ""
    },
    costOfRevenue: {
      label: "Cost of Revenue",
      baseValue: 420,
      mode: "trend",
      trendValues: [8, 7, 7, 6, 5],
      manualValues: [454, 486, 520, 551, 579],
      comment: ""
    },
    gaExpense: {
      label: "General & Administrative Expense",
      baseValue: 140,
      mode: "trend",
      trendValues: [5, 5, 4, 4, 4],
      manualValues: [147, 154, 160, 166, 173],
      comment: ""
    },
    interestCost: {
      label: "Interest Cost",
      baseValue: 24,
      mode: "manual",
      trendValues: [0, 0, 0, 0, 0],
      manualValues: [24, 23, 22, 21, 20],
      comment: ""
    },
    workingCapitalMovement: {
      label: "Working Capital Movement",
      baseValue: 18,
      mode: "manual",
      trendValues: [0, 0, 0, 0, 0],
      manualValues: [20, 22, 24, 25, 26],
      comment: ""
    }
  }
};

let state = deepClone(DEFAULT_STATE);

const assumptionsMeta = [
  { key: "wacc", label: "WACC (%)" },
  { key: "terminalGrowth", label: "Terminal Growth (%)" },
  { key: "taxRate", label: "Tax Rate (%)" },
  { key: "sharesOutstanding", label: "Shares Outstanding" },
  { key: "netDebt", label: "Net Debt" },
  { key: "peMultiple", label: "P/E Multiple" }
];

const assumptionContainer = document.getElementById("assumptionsContainer");
const projectionSetupContainer = document.getElementById("projectionSetupContainer");
const driversContainer = document.getElementById("driversContainer");
const forecastTable = document.getElementById("forecastTable");
const sensitivityTable = document.getElementById("sensitivityTable");

document.getElementById("runValuationBtn").addEventListener("click", runValuation);
document.getElementById("loadSampleBtn").addEventListener("click", loadSampleData);

init();

function init() {
  normalizeState();
  renderAll();
  runValuation();
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function normalizeState() {
  const n = Number(state.projectionYears) || 5;
  state.projectionYears = Math.max(1, Math.min(15, n));

  Object.values(state.drivers).forEach(driver => {
    driver.trendValues = resizeArray(driver.trendValues || [], state.projectionYears, 0);
    driver.manualValues = resizeArray(driver.manualValues || [], state.projectionYears, driver.baseValue || 0);
    if (!driver.mode) driver.mode = "trend";
    if (!driver.comment) driver.comment = "";
  });
}

function resizeArray(arr, length, fallback) {
  const out = [...arr];
  while (out.length < length) {
    out.push(fallback);
  }
  return out.slice(0, length);
}

function renderAll() {
  renderProjectionSetup();
  renderAssumptions();
  renderDrivers();
}

function renderProjectionSetup() {
  projectionSetupContainer.innerHTML = `
    <div class="assumption-card">
      <div class="input-group">
        <label for="projectionYearsInput">Number of Projected Years</label>
        <input
          id="projectionYearsInput"
          class="small-input"
          type="number"
          min="1"
          max="15"
          value="${state.projectionYears}"
        />
      </div>
      <div class="input-group">
        <label for="projectionYearsComment">Comment / justification</label>
        <textarea id="projectionYearsComment" placeholder="Explain why this forecast horizon is appropriate">${state.projectionYearsComment || ""}</textarea>
      </div>
      <div class="note-box">
        Changing projected years automatically expands or shrinks all forecast input rows.
      </div>
    </div>
  `;

  document.getElementById("projectionYearsInput").addEventListener("input", (e) => {
    state.projectionYears = Number(e.target.value) || 1;
    normalizeState();
    renderDrivers();
    runValuation();
  });

  document.getElementById("projectionYearsComment").addEventListener("input", (e) => {
    state.projectionYearsComment = e.target.value;
  });
}

function renderAssumptions() {
  assumptionContainer.innerHTML = "";

  assumptionsMeta.forEach(meta => {
    const item = state.assumptions[meta.key];
    const card = document.createElement("div");
    card.className = "assumption-card";

    let extraField = "";
    if (meta.key === "wacc") {
      extraField = `
        <div class="input-group">
          <label for="waccExplanation">Basis of WACC calculation</label>
          <textarea id="waccExplanation" placeholder="e.g. risk-free rate, beta, ERP, cost of debt, target capital structure">${item.explanation || ""}</textarea>
        </div>
      `;
    }

    card.innerHTML = `
      <h3>${meta.label}</h3>
      <div class="input-group">
        <label for="${meta.key}Value">Value</label>
        <input id="${meta.key}Value" type="number" step="any" value="${item.value}" />
      </div>
      ${extraField}
      <div class="input-group">
        <label for="${meta.key}Comment">Comment / justification</label>
        <textarea id="${meta.key}Comment" placeholder="Add rationale or notes">${item.comment || ""}</textarea>
      </div>
    `;

    assumptionContainer.appendChild(card);

    document.getElementById(`${meta.key}Value`).addEventListener("input", (e) => {
      state.assumptions[meta.key].value = toNumber(e.target.value);
      runValuation();
    });

    document.getElementById(`${meta.key}Comment`).addEventListener("input", (e) => {
      state.assumptions[meta.key].comment = e.target.value;
    });

    if (meta.key === "wacc") {
      document.getElementById("waccExplanation").addEventListener("input", (e) => {
        state.assumptions.wacc.explanation = e.target.value;
      });
    }
  });
}

function renderDrivers() {
  driversContainer.innerHTML = `<div class="driver-grid"></div>`;
  const grid = driversContainer.querySelector(".driver-grid");
  const years = getYearLabels();

  Object.entries(state.drivers).forEach(([key, driver]) => {
    const card = document.createElement("div");
    card.className = "driver-card";

    const modeIsTrend = driver.mode === "trend";

    const dynamicRow = modeIsTrend
      ? `
        <tr>
          <td>Trend %</td>
          ${years.map((_, i) => `
            <td>
              <input
                type="number"
                step="any"
                data-driver="${key}"
                data-type="trend"
                data-index="${i}"
                value="${driver.trendValues[i] ?? 0}"
              />
            </td>
          `).join("")}
        </tr>
        <tr>
          <td>Projected value</td>
          ${calculateDriverSeries(driver).map(v => `<td>${formatCurrency(v)}</td>`).join("")}
        </tr>
      `
      : `
        <tr>
          <td>Manual value</td>
          ${years.map((_, i) => `
            <td>
              <input
                type="number"
                step="any"
                data-driver="${key}"
                data-type="manual"
                data-index="${i}"
                value="${driver.manualValues[i] ?? 0}"
              />
            </td>
          `).join("")}
        </tr>
      `;

    card.innerHTML = `
      <h3>${driver.label} <span class="mode-badge">${modeIsTrend ? "Trend %" : "Manual"}</span></h3>

      <div class="driver-top">
        <div class="input-group">
          <label>Base year value</label>
          <input type="number" step="any" data-driver="${key}" data-type="base" value="${driver.baseValue}" />
        </div>

        <div class="input-group">
          <label>Forecast mode</label>
          <select data-driver="${key}" data-type="mode">
            <option value="trend" ${driver.mode === "trend" ? "selected" : ""}>Trend %</option>
            <option value="manual" ${driver.mode === "manual" ? "selected" : ""}>Manual numbers</option>
          </select>
        </div>

        <div class="input-group">
          <label>Comment / justification</label>
          <textarea data-driver="${key}" data-type="comment" placeholder="Explain assumptions for this line item">${driver.comment || ""}</textarea>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>${driver.label}</th>
              ${years.map(y => `<th>${y}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${dynamicRow}
          </tbody>
        </table>
      </div>
    `;

    grid.appendChild(card);
  });

  bindDriverEvents();
}

function bindDriverEvents() {
  driversContainer.querySelectorAll("[data-driver]").forEach(el => {
    el.addEventListener("input", handleDriverInput);
    el.addEventListener("change", handleDriverInput);
  });
}

function handleDriverInput(e) {
  const key = e.target.dataset.driver;
  const type = e.target.dataset.type;
  const driver = state.drivers[key];

  if (!driver) return;

  if (type === "base") {
    driver.baseValue = toNumber(e.target.value);
  } else if (type === "mode") {
    driver.mode = e.target.value;
    renderDrivers();
  } else if (type === "comment") {
    driver.comment = e.target.value;
  } else if (type === "trend") {
    const idx = Number(e.target.dataset.index);
    driver.trendValues[idx] = toNumber(e.target.value);
    renderDrivers();
  } else if (type === "manual") {
    const idx = Number(e.target.dataset.index);
    driver.manualValues[idx] = toNumber(e.target.value);
  }

  runValuation();
}

function getYearLabels() {
  return Array.from({ length: state.projectionYears }, (_, i) => `Year ${i + 1}`);
}

function calculateDriverSeries(driver) {
  if (driver.mode === "manual") {
    return driver.manualValues.slice(0, state.projectionYears).map(v => toNumber(v));
  }

  const values = [];
  let prior = toNumber(driver.baseValue);

  for (let i = 0; i < state.projectionYears; i++) {
    const trendPct = toNumber(driver.trendValues[i]);
    const current = prior * (1 + trendPct / 100);
    values.push(current);
    prior = current;
  }

  return values;
}

function buildForecast() {
  const revenue = calculateDriverSeries(state.drivers.revenue);
  const costOfRevenue = calculateDriverSeries(state.drivers.costOfRevenue);
  const gaExpense = calculateDriverSeries(state.drivers.gaExpense);
  const interestCost = calculateDriverSeries(state.drivers.interestCost);
  const workingCapitalMovement = calculateDriverSeries(state.drivers.workingCapitalMovement);

  const taxRate = toNumber(state.assumptions.taxRate.value) / 100;

  const ebit = [];
  const ebt = [];
  const taxes = [];
  const netIncome = [];
  const fcff = [];

  for (let i = 0; i < state.projectionYears; i++) {
    const grossProfit = revenue[i] - costOfRevenue[i];
    const thisEbit = grossProfit - gaExpense[i];
    const thisEbt = thisEbit - interestCost[i];
    const thisTax = Math.max(thisEbt, 0) * taxRate;
    const thisNetIncome = thisEbt - thisTax;
    const thisFcff = (thisEbit * (1 - taxRate)) - workingCapitalMovement[i];

    ebit.push(thisEbit);
    ebt.push(thisEbt);
    taxes.push(thisTax);
    netIncome.push(thisNetIncome);
    fcff.push(thisFcff);
  }

  return {
    revenue,
    costOfRevenue,
    gaExpense,
    interestCost,
    workingCapitalMovement,
    ebit,
    ebt,
    taxes,
    netIncome,
    fcff
  };
}

function runValuation() {
  normalizeState();

  const forecast = buildForecast();
  renderForecastTable(forecast);

  const wacc = toNumber(state.assumptions.wacc.value) / 100;
  const terminalGrowth = toNumber(state.assumptions.terminalGrowth.value) / 100;
  const shares = Math.max(toNumber(state.assumptions.sharesOutstanding.value), 0.0001);
  const netDebt = toNumber(state.assumptions.netDebt.value);
  const peMultiple = toNumber(state.assumptions.peMultiple.value);

  let pvSum = 0;
  const pvFcf = [];

  forecast.fcff.forEach((fcf, i) => {
    const pv = fcf / Math.pow(1 + wacc, i + 1);
    pvFcf.push(pv);
    pvSum += pv;
  });

  let terminalValue = 0;
  if (wacc > terminalGrowth) {
    const finalFcf = forecast.fcff[forecast.fcff.length - 1];
    terminalValue = (finalFcf * (1 + terminalGrowth)) / (wacc - terminalGrowth);
  }

  const pvTerminalValue = terminalValue / Math.pow(1 + wacc, state.projectionYears);
  const enterpriseValue = pvSum + pvTerminalValue;
  const dcfEquityValue = enterpriseValue - netDebt;
  const dcfValuePerShare = dcfEquityValue / shares;

  const terminalNetIncome = forecast.netIncome[forecast.netIncome.length - 1] || 0;
  const compEquityValue = terminalNetIncome * peMultiple;
  const compValuePerShare = compEquityValue / shares;

  const blendedValuePerShare = (dcfValuePerShare + compValuePerShare) / 2;

  setText("dcfEquityValue", formatCurrency(dcfEquityValue));
  setText("dcfValuePerShare", formatCurrency(dcfValuePerShare));
  setText("compEquityValue", formatCurrency(compEquityValue));
  setText("compValuePerShare", formatCurrency(compValuePerShare));
  setText("blendedValuePerShare", formatCurrency(blendedValuePerShare));

  renderSensitivityTable(forecast);
}

function renderForecastTable(forecast) {
  const years = getYearLabels();

  const rows = [
    ["Revenue", forecast.revenue],
    ["Cost of Revenue", forecast.costOfRevenue],
    ["G&A", forecast.gaExpense],
    ["EBIT", forecast.ebit],
    ["Interest Cost", forecast.interestCost],
    ["EBT", forecast.ebt],
    ["Taxes", forecast.taxes],
    ["Net Income", forecast.netIncome],
    ["Working Capital Movement", forecast.workingCapitalMovement],
    ["FCFF", forecast.fcff]
  ];

  forecastTable.innerHTML = `
    <thead>
      <tr>
        <th>Metric</th>
        ${years.map(y => `<th>${y}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${rows.map(([label, values]) => `
        <tr>
          <td>${label}</td>
          ${values.map(v => `
            <td class="${v < 0 ? "metric-negative" : ""}">${formatCurrency(v)}</td>
          `).join("")}
        </tr>
      `).join("")}
    </tbody>
  `;
}

function renderSensitivityTable(forecast) {
  const baseWacc = toNumber(state.assumptions.wacc.value);
  const baseGrowth = toNumber(state.assumptions.terminalGrowth.value);
  const shares = Math.max(toNumber(state.assumptions.sharesOutstanding.value), 0.0001);
  const netDebt = toNumber(state.assumptions.netDebt.value);

  const waccRange = [baseWacc - 2, baseWacc - 1, baseWacc, baseWacc + 1, baseWacc + 2];
  const growthRange = [baseGrowth - 1, baseGrowth - 0.5, baseGrowth, baseGrowth + 0.5, baseGrowth + 1];

  const finalFcf = forecast.fcff[forecast.fcff.length - 1] || 0;
  let explicitPv = 0;

  forecast.fcff.forEach((fcf, i) => {
    explicitPv += fcf / Math.pow(1 + baseWacc / 100, i + 1);
  });

  sensitivityTable.innerHTML = `
    <thead>
      <tr>
        <th>WACC \\ TG</th>
        ${growthRange.map(g => `<th>${g.toFixed(1)}%</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${waccRange.map(w => `
        <tr>
          <td>${w.toFixed(1)}%</td>
          ${growthRange.map(g => {
            let valuePerShare = 0;

            if (w / 100 > g / 100) {
              let pvExplicit = 0;
              forecast.fcff.forEach((fcf, i) => {
                pvExplicit += fcf / Math.pow(1 + w / 100, i + 1);
              });

              const tv = (finalFcf * (1 + g / 100)) / ((w / 100) - (g / 100));
              const pvTv = tv / Math.pow(1 + w / 100, state.projectionYears);
              const equity = pvExplicit + pvTv - netDebt;
              valuePerShare = equity / shares;
            }

            return `<td>${formatCurrency(valuePerShare)}</td>`;
          }).join("")}
        </tr>
      `).join("")}
    </tbody>
  `;
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value) {
  const currency = state.currency || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
  }
}

async function loadSampleData() {
  try {
    const res = await fetch("sample-data.json");
    const data = await res.json();
    state = data;
    normalizeState();
    renderAll();
    runValuation();
  } catch (err) {
    console.error("Failed to load sample data:", err);
    state = deepClone(DEFAULT_STATE);
    normalizeState();
    renderAll();
    runValuation();
  }
}
