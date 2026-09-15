const STORAGE_KEY = "valuation_app_saved_drafts_v4";
const EXPORT_VERSION = "4.0";

const DEFAULT_STATE = {
  companyName: "Example Co",
  currency: "USD",
  projectionYears: 5,
  projectionYearsComment: "",
  reportSettings: {
    title: "Valuation Report",
    subtitle: "DCF and Comparable Valuation Summary",
    preparedBy: "",
    headerLeft: "Confidential",
    headerRight: "",
    footerNote: "For discussion purposes only.",
    logoUrl: "",
    coverNote: "This report summarizes key assumptions, forecast drivers, valuation outputs, and sensitivity analysis."
  },
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
let selectedDraftName = "";
let latestResults = null;

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
const savedDraftsContainer = document.getElementById("savedDraftsContainer");
const reportSettingsContainer = document.getElementById("reportSettingsContainer");
const driversContainer = document.getElementById("driversContainer");
const forecastTable = document.getElementById("forecastTable");
const sensitivityTable = document.getElementById("sensitivityTable");
const importDraftFile = document.getElementById("importDraftFile");

document.getElementById("runValuationBtn").addEventListener("click", runValuation);
document.getElementById("loadSampleBtn").addEventListener("click", loadSampleData);
document.getElementById("printReportBtn").addEventListener("click", printReport);
document.getElementById("downloadReportHtmlBtn").addEventListener("click", downloadReportHtml);
importDraftFile.addEventListener("change", handleImportDraftFile);

init();

function init() {
  normalizeState();
  renderAll();
  runValuation();
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function mergeDeep(target, source) {
  if (!source || typeof source !== "object") return target;

  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];

    if (Array.isArray(sourceValue)) {
      target[key] = deepClone(sourceValue);
    } else if (sourceValue && typeof sourceValue === "object") {
      if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
        target[key] = {};
      }
      mergeDeep(target[key], sourceValue);
    } else {
      target[key] = sourceValue;
    }
  });

  return target;
}

function coerceImportedState(candidate) {
  const merged = deepClone(DEFAULT_STATE);
  mergeDeep(merged, candidate || {});
  return merged;
}

function normalizeState() {
  const n = Number(state.projectionYears) || 5;
  state.projectionYears = Math.max(1, Math.min(15, n));

  state.companyName = state.companyName || "Example Co";
  state.currency = (state.currency || "USD").toUpperCase().trim();
  state.projectionYearsComment = state.projectionYearsComment || "";

  if (!state.reportSettings) {
    state.reportSettings = deepClone(DEFAULT_STATE.reportSettings);
  } else {
    state.reportSettings = coerceImportedState({ reportSettings: state.reportSettings }).reportSettings;
  }

  Object.values(state.drivers).forEach((driver) => {
    driver.trendValues = resizeArray(driver.trendValues || [], state.projectionYears, 0);
    driver.manualValues = resizeArray(driver.manualValues || [], state.projectionYears, driver.baseValue || 0);
    if (!driver.mode) driver.mode = "trend";
    if (!driver.comment) driver.comment = "";
  });
}

function resizeArray(arr, length, fallback) {
  const out = [...arr];
  while (out.length < length) out.push(fallback);
  return out.slice(0, length);
}

function renderAll() {
  renderProjectionSetup();
  renderAssumptions();
  renderSavedDrafts();
  renderReportSettings();
  renderDrivers();
}

function renderProjectionSetup() {
  projectionSetupContainer.innerHTML = `
    <div class="assumption-card">
      <div class="input-group">
        <label for="companyNameInput">Company Name</label>
        <input id="companyNameInput" type="text" value="${escapeAttribute(state.companyName)}" />
      </div>

      <div class="input-group">
        <label for="currencyInput">Currency Code</label>
        <input id="currencyInput" class="small-input" type="text" value="${escapeAttribute(state.currency)}" />
        <div class="inline-help">Use a 3-letter currency code such as USD, EUR, GBP, JPY.</div>
      </div>

      <div class="input-group">
        <label for="projectionYearsInput">Number of Projected Years</label>
        <input id="projectionYearsInput" class="small-input" type="number" min="1" max="15" value="${state.projectionYears}" />
      </div>

      <div class="input-group">
        <label for="projectionYearsComment">Comment / justification</label>
        <textarea id="projectionYearsComment" placeholder="Explain why this forecast horizon is appropriate">${escapeHtml(state.projectionYearsComment)}</textarea>
      </div>

      <div class="note-box">
        Changing projected years automatically expands or shrinks all forecast rows and valuation output columns.
      </div>
    </div>
  `;

  document.getElementById("companyNameInput").addEventListener("input", (e) => {
    state.companyName = e.target.value;
    renderReportSettings();
  });

  document.getElementById("currencyInput").addEventListener("input", (e) => {
    state.currency = (e.target.value || "USD").toUpperCase().trim();
    runValuation();
  });

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

  assumptionsMeta.forEach((meta) => {
    const item = state.assumptions[meta.key];
    const card = document.createElement("div");
    card.className = "assumption-card";

    const extraField = meta.key === "wacc"
      ? `
        <div class="input-group">
          <label for="waccExplanation">Basis of WACC calculation</label>
          <textarea id="waccExplanation" placeholder="e.g. risk-free rate, beta, ERP, cost of debt, target capital structure">${escapeHtml(item.explanation || "")}</textarea>
        </div>
      `
      : "";

    card.innerHTML = `
      <h3>${meta.label}</h3>
      <div class="input-group">
        <label for="${meta.key}Value">Value</label>
        <input id="${meta.key}Value" type="number" step="any" value="${item.value}" />
      </div>
      ${extraField}
      <div class="input-group">
        <label for="${meta.key}Comment">Comment / justification</label>
        <textarea id="${meta.key}Comment" placeholder="Add rationale or notes">${escapeHtml(item.comment || "")}</textarea>
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

function renderSavedDrafts() {
  const drafts = getSavedDrafts();
  const names = Object.keys(drafts).sort((a, b) => {
    return new Date(drafts[b].savedAt).getTime() - new Date(drafts[a].savedAt).getTime();
  });

  if (selectedDraftName && !drafts[selectedDraftName]) selectedDraftName = "";
  if (!selectedDraftName && names.length) selectedDraftName = names[0];

  const selectedDraft = selectedDraftName ? drafts[selectedDraftName] : null;

  savedDraftsContainer.innerHTML = `
    <div class="saved-drafts-grid">
      <div class="report-card">
        <h3>Local Draft Storage</h3>
        <div class="input-group">
          <label for="draftNameInput">Draft Name</label>
          <input id="draftNameInput" type="text" placeholder="e.g. Base Case Sep 2026" value="${escapeAttribute(selectedDraftName || "")}" />
        </div>

        <div class="action-row">
          <button id="saveDraftBtn">Save Current Draft</button>
          <button id="exportDraftBtn" class="secondary">Export Current Draft JSON</button>
          <button id="importDraftBtn" class="secondary">Import Draft JSON</button>
        </div>

        <div class="note-box">
          Browser drafts stay on this device and browser only. Export JSON if you want backup, sharing, or transfer to another machine.
        </div>
      </div>

      <div class="report-card">
        <h3>Saved Drafts</h3>
        <div class="input-group">
          <label for="savedDraftSelect">Saved Drafts</label>
          <select id="savedDraftSelect">
            ${
              names.length === 0
                ? `<option value="">No saved drafts</option>`
                : names.map((name) => `
                  <option value="${escapeAttribute(name)}" ${name === selectedDraftName ? "selected" : ""}>
                    ${escapeHtml(name)}
                  </option>
                `).join("")
            }
          </select>
        </div>

        <div class="action-row">
          <button id="loadDraftBtn" class="secondary" ${selectedDraft ? "" : "disabled"}>Load Selected Draft</button>
          <button id="deleteDraftBtn" class="danger" ${selectedDraft ? "" : "disabled"}>Delete Selected Draft</button>
        </div>

        <div class="meta-text">
          ${selectedDraft ? `Last saved: ${formatDateTime(selectedDraft.savedAt)}` : `No draft selected`}
        </div>
      </div>
    </div>
  `;

  document.getElementById("draftNameInput").addEventListener("input", (e) => {
    selectedDraftName = e.target.value;
  });

  document.getElementById("saveDraftBtn").addEventListener("click", saveDraft);
  document.getElementById("exportDraftBtn").addEventListener("click", exportCurrentDraftJson);
  document.getElementById("importDraftBtn").addEventListener("click", () => importDraftFile.click());

  const savedDraftSelect = document.getElementById("savedDraftSelect");
  savedDraftSelect.addEventListener("change", (e) => {
    selectedDraftName = e.target.value;
    renderSavedDrafts();
  });

  const loadDraftBtn = document.getElementById("loadDraftBtn");
  const deleteDraftBtn = document.getElementById("deleteDraftBtn");

  if (loadDraftBtn) loadDraftBtn.addEventListener("click", loadSelectedDraft);
  if (deleteDraftBtn) deleteDraftBtn.addEventListener("click", deleteSelectedDraft);
}

function renderReportSettings() {
  const rs = state.reportSettings;

  reportSettingsContainer.innerHTML = `
    <div class="report-settings-grid">
      <div class="report-card">
        <h3>Branding Fields</h3>

        <div class="input-group">
          <label for="reportTitleInput">Report Title</label>
          <input id="reportTitleInput" type="text" value="${escapeAttribute(rs.title)}" />
        </div>

        <div class="input-group">
          <label for="reportSubtitleInput">Report Subtitle</label>
          <input id="reportSubtitleInput" type="text" value="${escapeAttribute(rs.subtitle)}" />
        </div>

        <div class="input-group">
          <label for="preparedByInput">Prepared By</label>
          <input id="preparedByInput" type="text" value="${escapeAttribute(rs.preparedBy)}" placeholder="Analyst or team name" />
        </div>

        <div class="input-group">
          <label for="logoUrlInput">Logo URL</label>
          <input id="logoUrlInput" type="url" value="${escapeAttribute(rs.logoUrl)}" placeholder="https://example.com/logo.png" />
          <div class="inline-help">Optional. If left blank, the report uses a generated monogram logo.</div>
        </div>

        <div class="logo-preview">
          ${rs.logoUrl
            ? `<img src="${escapeAttribute(rs.logoUrl)}" alt="Logo preview" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';" /><div class="logo-fallback" style="display:none;">${escapeHtml(getInitials(state.companyName))}</div>`
            : `<div class="logo-fallback">${escapeHtml(getInitials(state.companyName))}</div>`
          }
          <div class="logo-preview-text">
            <strong>${escapeHtml(state.companyName || "Company")}</strong>
            <span class="muted">${escapeHtml(rs.title || "Valuation Report")}</span>
          </div>
        </div>
      </div>

      <div class="report-card">
        <h3>Cover & Header Text</h3>

        <div class="input-group">
          <label for="headerLeftInput">Header Left</label>
          <input id="headerLeftInput" type="text" value="${escapeAttribute(rs.headerLeft)}" placeholder="Confidential" />
        </div>

        <div class="input-group">
          <label for="headerRightInput">Header Right</label>
          <input id="headerRightInput" type="text" value="${escapeAttribute(rs.headerRight)}" placeholder="Internal Use Only" />
        </div>

        <div class="input-group">
          <label for="footerNoteInput">Footer Note</label>
          <textarea id="footerNoteInput" placeholder="Footer disclaimer or note">${escapeHtml(rs.footerNote)}</textarea>
        </div>

        <div class="input-group">
          <label for="coverNoteInput">Cover Page Note</label>
          <textarea id="coverNoteInput" class="cover-note" placeholder="Executive note for the cover page">${escapeHtml(rs.coverNote)}</textarea>
        </div>

        <div class="action-row">
          <button id="downloadReportHtmlBtnInline" class="secondary">Download Report HTML</button>
          <button id="printReportBtnInline" class="secondary">Print Report</button>
        </div>
      </div>
    </div>
  `;

  bindReportSettingsEvents();
}

function bindReportSettingsEvents() {
  const map = [
    ["reportTitleInput", "title"],
    ["reportSubtitleInput", "subtitle"],
    ["preparedByInput", "preparedBy"],
    ["logoUrlInput", "logoUrl"],
    ["headerLeftInput", "headerLeft"],
    ["headerRightInput", "headerRight"],
    ["footerNoteInput", "footerNote"],
    ["coverNoteInput", "coverNote"]
  ];

  map.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", (e) => {
      state.reportSettings[key] = e.target.value;
      if (key === "logoUrl" || key === "title" || key === "subtitle") {
        renderReportSettings();
      }
    });
  });

  document.getElementById("downloadReportHtmlBtnInline").addEventListener("click", downloadReportHtml);
  document.getElementById("printReportBtnInline").addEventListener("click", printReport);
}

function saveDraft() {
  const drafts = getSavedDrafts();
  const draftNameInput = document.getElementById("draftNameInput");
  const typedName = (draftNameInput?.value || "").trim();
  const name = typedName || selectedDraftName.trim() || autoDraftName();

  drafts[name] = {
    savedAt: new Date().toISOString(),
    data: deepClone(state)
  };

  setSavedDrafts(drafts);
  selectedDraftName = name;
  renderSavedDrafts();
  alert(`Draft saved: ${name}`);
}

function loadSelectedDraft() {
  const drafts = getSavedDrafts();
  const select = document.getElementById("savedDraftSelect");
  const name = select?.value || selectedDraftName;

  if (!name || !drafts[name]) {
    alert("Please select a saved draft to load.");
    return;
  }

  state = coerceImportedState(deepClone(drafts[name].data));
  selectedDraftName = name;
  normalizeState();
  renderAll();
  runValuation();
}

function deleteSelectedDraft() {
  const drafts = getSavedDrafts();
  const select = document.getElementById("savedDraftSelect");
  const name = select?.value || selectedDraftName;

  if (!name || !drafts[name]) {
    alert("Please select a saved draft to delete.");
    return;
  }

  if (!confirm(`Delete draft "${name}"?`)) return;

  delete drafts[name];
  setSavedDrafts(drafts);
  selectedDraftName = "";
  renderSavedDrafts();
}

function exportCurrentDraftJson() {
  const payload = {
    app: "valuation-app",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    draftName: (document.getElementById("draftNameInput")?.value || selectedDraftName || autoDraftName()).trim(),
    data: deepClone(state)
  };

  const fileName = `${slugify(payload.draftName || "valuation-draft")}.json`;
  downloadBlob(JSON.stringify(payload, null, 2), fileName, "application/json");
}

function handleImportDraftFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const raw = JSON.parse(reader.result);
      const importedState = raw && raw.data ? raw.data : raw;
      state = coerceImportedState(importedState);
      selectedDraftName = raw?.draftName || stripFileExtension(file.name) || autoDraftName();
      normalizeState();
      renderAll();
      runValuation();
      alert(`Draft imported into current workspace: ${selectedDraftName}`);
    } catch (err) {
      console.error(err);
      alert("Import failed. Please choose a valid valuation draft JSON file.");
    } finally {
      event.target.value = "";
    }
  };

  reader.onerror = () => {
    alert("Unable to read the selected file.");
    event.target.value = "";
  };

  reader.readAsText(file);
}

function getSavedDrafts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setSavedDrafts(drafts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

function autoDraftName() {
  return `${state.companyName || "Valuation"} - ${new Date().toLocaleString()}`;
}

function renderDrivers() {
  driversContainer.innerHTML = `<div class="driver-grid"></div>`;
  const grid = driversContainer.querySelector(".driver-grid");
  const years = getYearLabels();

  Object.entries(state.drivers).forEach(([key, driver]) => {
    const card = document.createElement("div");
    card.className = "driver-card";

    const isTrend = driver.mode === "trend";

    const dynamicRow = isTrend
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
          ${calculateDriverSeries(driver).map((v) => `<td>${formatCurrency(v)}</td>`).join("")}
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
      <h3>${driver.label} <span class="mode-badge">${isTrend ? "Trend %" : "Manual"}</span></h3>

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
          <textarea data-driver="${key}" data-type="comment" placeholder="Explain assumptions for this line item">${escapeHtml(driver.comment || "")}</textarea>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>${driver.label}</th>
              ${years.map((y) => `<th>${y}</th>`).join("")}
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
  driversContainer.querySelectorAll("[data-driver]").forEach((el) => {
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
    return driver.manualValues.slice(0, state.projectionYears).map((v) => toNumber(v));
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
  forecast.fcff.forEach((fcf, i) => {
    pvSum += fcf / Math.pow(1 + wacc, i + 1);
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

  latestResults = {
    forecast,
    enterpriseValue,
    dcfEquityValue,
    dcfValuePerShare,
    compEquityValue,
    compValuePerShare,
    blendedValuePerShare
  };

  return latestResults;
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
        ${years.map((y) => `<th>${y}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${rows.map(([label, values]) => `
        <tr>
          <td>${label}</td>
          ${values.map((v) => `<td class="${v < 0 ? "metric-negative" : ""}">${formatCurrency(v)}</td>`).join("")}
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

  sensitivityTable.innerHTML = `
    <thead>
      <tr>
        <th>WACC \\ TG</th>
        ${growthRange.map((g) => `<th>${g.toFixed(1)}%</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${waccRange.map((w) => `
        <tr>
          <td>${w.toFixed(1)}%</td>
          ${growthRange.map((g) => {
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

function printReport() {
  const reportHtml = buildStandaloneReportHtml({ autoPrint: true });
  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    alert("Unable to open print window. Please allow pop-ups for this page.");
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(reportHtml);
  reportWindow.document.close();
}

function downloadReportHtml() {
  const reportHtml = buildStandaloneReportHtml({ autoPrint: false });
  const name = `${slugify(state.companyName || "company")}-${slugify(state.reportSettings.title || "valuation-report")}.html`;
  downloadBlob(reportHtml, name, "text/html");
}

function buildStandaloneReportHtml({ autoPrint = false } = {}) {
  const results = latestResults || runValuation();
  const rs = state.reportSettings;
  const reportDate = new Date();
  const reportDateLong = reportDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const reportDateTime = reportDate.toLocaleString();
  const yearLabels = getYearLabels();

  const assumptionRows = assumptionsMeta.map((meta) => {
    const item = state.assumptions[meta.key];
    return `
      <tr>
        <td>${escapeHtml(meta.label)}</td>
        <td>${formatAssumptionValue(meta.key, item.value)}</td>
        <td>${nl2br(item.comment || "")}</td>
        <td>${meta.key === "wacc" ? nl2br(item.explanation || "") : ""}</td>
      </tr>
    `;
  }).join("");

  const driverRows = Object.values(state.drivers).map((driver) => {
    const modeLabel = driver.mode === "trend" ? "Trend %" : "Manual numbers";
    const inputCells = yearLabels.map((_, i) => {
      const value = driver.mode === "trend"
        ? `${toNumber(driver.trendValues[i]).toFixed(2)}%`
        : formatCurrency(toNumber(driver.manualValues[i]));
      return `<td>${value}</td>`;
    }).join("");

    return `
      <tr>
        <td>${escapeHtml(driver.label)}</td>
        <td>${formatCurrency(driver.baseValue)}</td>
        <td>${modeLabel}</td>
        ${inputCells}
        <td>${nl2br(driver.comment || "")}</td>
      </tr>
    `;
  }).join("");

  const logoCover = rs.logoUrl
    ? `<img class="cover-logo-img" src="${escapeAttribute(rs.logoUrl)}" alt="Logo" />`
    : `<div class="cover-logo-fallback">${escapeHtml(getInitials(state.companyName))}</div>`;

  const logoHeader = rs.logoUrl
    ? `<img class="header-logo-img" src="${escapeAttribute(rs.logoUrl)}" alt="Logo" />`
    : `<div class="header-logo-fallback">${escapeHtml(getInitials(state.companyName))}</div>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(rs.title || "Valuation Report")} - ${escapeHtml(state.companyName || "Company")}</title>
  <style>
    :root {
      --ink: #111827;
      --muted: #6b7280;
      --line: #dbe2ea;
      --light: #f8fafc;
      --blue: #1d4ed8;
      --navy: #0f172a;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: var(--ink);
      background: white;
      font-size: 12px;
      line-height: 1.5;
    }

    .page {
      width: 100%;
      padding: 18mm 16mm;
    }

    .cover-page {
      min-height: 277mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(180deg, #f8fbff 0%, #ffffff 55%);
      border-bottom: 8px solid var(--blue);
    }

    .cover-topbar {
      height: 10px;
      background: linear-gradient(90deg, var(--blue), var(--navy));
      border-radius: 999px;
      margin-bottom: 28px;
    }

    .cover-brand {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 36px;
    }

    .cover-logo-img,
    .cover-logo-fallback {
      width: 88px;
      height: 88px;
      border-radius: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      object-fit: contain;
      background: white;
      border: 1px solid var(--line);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
    }

    .cover-logo-fallback {
      background: linear-gradient(135deg, var(--blue), var(--navy));
      color: white;
      font-size: 30px;
      font-weight: 700;
      letter-spacing: 1px;
      border: none;
    }

    .cover-company {
      font-size: 15px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 8px;
    }

    .cover-title {
      font-size: 34px;
      line-height: 1.15;
      margin: 0 0 12px;
      color: var(--navy);
    }

    .cover-subtitle {
      font-size: 17px;
      color: var(--muted);
      margin-bottom: 20px;
    }

    .cover-meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(160px, 1fr));
      gap: 12px;
      max-width: 680px;
      margin-top: 20px;
    }

    .meta-card {
      border: 1px solid var(--line);
      background: white;
      border-radius: 12px;
      padding: 12px 14px;
    }

    .meta-label {
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 6px;
    }

    .meta-value {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
    }

    .cover-note-box {
      margin-top: 28px;
      border: 1px solid var(--line);
      background: white;
      border-left: 6px solid var(--blue);
      border-radius: 12px;
      padding: 16px 18px;
      white-space: pre-wrap;
    }

    .cover-footer {
      color: var(--muted);
      font-size: 11px;
      border-top: 1px solid var(--line);
      padding-top: 14px;
      margin-top: 36px;
    }

    .page-break {
      page-break-before: always;
    }

    .content-header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 14px;
      align-items: center;
      border-bottom: 2px solid var(--line);
      padding-bottom: 12px;
      margin-bottom: 22px;
    }

    .header-logo-img,
    .header-logo-fallback {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      object-fit: contain;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: white;
      border: 1px solid var(--line);
    }

    .header-logo-fallback {
      background: linear-gradient(135deg, var(--blue), var(--navy));
      color: white;
      font-weight: 700;
      font-size: 18px;
      border: none;
    }

    .content-header-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 2px;
    }

    .content-header-subtitle {
      font-size: 12px;
      color: var(--muted);
    }

    .content-header-right {
      text-align: right;
      font-size: 11px;
      color: var(--muted);
    }

    .section {
      margin-bottom: 28px;
    }

    .section h2 {
      margin: 0 0 10px;
      font-size: 17px;
      color: var(--navy);
      border-bottom: 1px solid var(--line);
      padding-bottom: 6px;
    }

    .section-note {
      color: var(--muted);
      margin-bottom: 10px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 10px;
    }

    .summary-card {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px;
      background: #fbfdff;
    }

    .summary-card.highlight {
      background: #eff6ff;
      border-color: #bfdbfe;
    }

    .summary-label {
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
    }

    .summary-value {
      font-size: 22px;
      font-weight: 700;
      color: var(--ink);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
      margin-top: 8px;
    }

    th, td {
      border: 1px solid var(--line);
      padding: 8px;
      text-align: right;
      vertical-align: top;
      word-break: break-word;
    }

    th {
      background: #f3f6fb;
      font-weight: 700;
    }

    th:first-child,
    td:first-child {
      text-align: left;
      font-weight: 600;
      background: #fafbfd;
    }

    .negative {
      color: #b91c1c;
    }

    .footer-block {
      margin-top: 30px;
      border-top: 1px solid var(--line);
      padding-top: 12px;
      font-size: 11px;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    @page {
      size: A4 landscape;
      margin: 12mm;
    }

    @media print {
      .page {
        padding: 0;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
  ${autoPrint ? `
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 350);
    });
  </script>
  ` : ""}
</head>
<body>
  <div class="page cover-page">
    <div>
      <div class="cover-topbar"></div>

      <div class="cover-brand">
        ${logoCover}
        <div>
          <div class="cover-company">${escapeHtml(state.companyName || "Company")}</div>
          <h1 class="cover-title">${escapeHtml(rs.title || "Valuation Report")}</h1>
          <div class="cover-subtitle">${escapeHtml(rs.subtitle || "")}</div>
        </div>
      </div>

      <div class="cover-meta">
        <div class="meta-card">
          <div class="meta-label">Prepared For</div>
          <div class="meta-value">${escapeHtml(state.companyName || "-")}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Prepared By</div>
          <div class="meta-value">${escapeHtml(rs.preparedBy || "-")}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Report Date</div>
          <div class="meta-value">${escapeHtml(reportDateLong)}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Currency</div>
          <div class="meta-value">${escapeHtml(state.currency || "USD")}</div>
        </div>
      </div>

      <div class="cover-note-box">${nl2br(rs.coverNote || "")}</div>
    </div>

    <div class="cover-footer">
      <strong>${escapeHtml(rs.headerLeft || "Confidential")}</strong>
      ${rs.headerRight ? ` | ${escapeHtml(rs.headerRight)}` : ""}
      <br />
      ${nl2br(rs.footerNote || "")}
    </div>
  </div>

  <div class="page page-break">
    <div class="content-header">
      <div>${logoHeader}</div>
      <div>
        <div class="content-header-title">${escapeHtml(rs.title || "Valuation Report")}</div>
        <div class="content-header-subtitle">${escapeHtml(state.companyName || "Company")} • ${escapeHtml(rs.subtitle || "")}</div>
      </div>
      <div class="content-header-right">
        ${escapeHtml(rs.headerLeft || "Confidential")}<br />
        ${escapeHtml(rs.headerRight || reportDateLong)}
      </div>
    </div>

    <div class="section">
      <h2>Executive Summary</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">DCF Equity Value</div>
          <div class="summary-value">${formatCurrency(results.dcfEquityValue)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">DCF Value / Share</div>
          <div class="summary-value">${formatCurrency(results.dcfValuePerShare)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Comparable Equity Value</div>
          <div class="summary-value">${formatCurrency(results.compEquityValue)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Comparable Value / Share</div>
          <div class="summary-value">${formatCurrency(results.compValuePerShare)}</div>
        </div>
        <div class="summary-card highlight">
          <div class="summary-label">Blended Value / Share</div>
          <div class="summary-value">${formatCurrency(results.blendedValuePerShare)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Projection Years</div>
          <div class="summary-value">${state.projectionYears}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Projection Setup</h2>
      <table>
        <tbody>
          <tr><td>Company Name</td><td>${escapeHtml(state.companyName || "-")}</td></tr>
          <tr><td>Currency</td><td>${escapeHtml(state.currency || "USD")}</td></tr>
          <tr><td>Projection Years</td><td>${state.projectionYears}</td></tr>
          <tr><td>Projection Horizon Comment</td><td>${nl2br(state.projectionYearsComment || "")}</td></tr>
          <tr><td>Report Generated</td><td>${escapeHtml(reportDateTime)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>General Assumptions</h2>
      <table>
        <thead>
          <tr>
            <th>Assumption</th>
            <th>Value</th>
            <th>Comment / Justification</th>
            <th>WACC Basis / Explanation</th>
          </tr>
        </thead>
        <tbody>
          ${assumptionRows}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Forecast Driver Inputs</h2>
      <div class="section-note">Trend mode shows the entered annual percentage change. Manual mode shows direct projected values.</div>
      <table>
        <thead>
          <tr>
            <th>Line Item</th>
            <th>Base Year</th>
            <th>Mode</th>
            ${yearLabels.map((y) => `<th>${y}</th>`).join("")}
            <th>Comment / Justification</th>
          </tr>
        </thead>
        <tbody>
          ${driverRows}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Forecast Output</h2>
      ${sanitizeTableHtml(forecastTable.outerHTML)}
    </div>

    <div class="section">
      <h2>DCF Sensitivity</h2>
      ${sanitizeTableHtml(sensitivityTable.outerHTML)}
    </div>

    <div class="footer-block">
      <div>${escapeHtml(rs.footerNote || "")}</div>
      <div>${escapeHtml(state.companyName || "Company")} • ${escapeHtml(rs.title || "Valuation Report")}</div>
    </div>
  </div>
</body>
</html>
  `;
}

function sanitizeTableHtml(tableHtml) {
  return String(tableHtml || "").replace(/class="metric-negative"/g, 'class="negative"');
}

function formatAssumptionValue(key, value) {
  if (["wacc", "terminalGrowth", "taxRate"].includes(key)) {
    return `${toNumber(value).toFixed(2)}%`;
  }
  if (key === "peMultiple") {
    return `${toNumber(value).toFixed(2)}x`;
  }
  if (key === "sharesOutstanding") {
    return formatNumber(value);
  }
  return formatCurrency(value);
}

function getInitials(text) {
  const words = String(text || "VC")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) return "VR";
  return words.map((w) => w[0]?.toUpperCase() || "").join("");
}

function slugify(text) {
  return String(text || "file")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "file";
}

function stripFileExtension(fileName) {
  return String(fileName || "").replace(/\.[^.]+$/, "");
}

function downloadBlob(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function formatDateTime(isoString) {
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function nl2br(value) {
  return escapeHtml(value || "").replace(/\n/g, "<br>");
}

async function loadSampleData() {
  try {
    const res = await fetch("sample-data.json");
    const data = await res.json();
    state = coerceImportedState(data);
    selectedDraftName = "";
    normalizeState();
    renderAll();
    runValuation();
  } catch (err) {
    console.error("Failed to load sample data:", err);
    state = deepClone(DEFAULT_STATE);
    selectedDraftName = "";
    normalizeState();
    renderAll();
    runValuation();
  }
}
