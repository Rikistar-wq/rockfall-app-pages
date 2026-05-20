const commentChoices = {
  floating: {
    A: [
      ["1", "基岩との分離状況"],
      ["2", "亀裂の深さ"],
      ["3", "背面空隙"],
      ["4", "抜け落ち状況"],
      ["5", "開口亀裂"],
      ["6", "ずれだし・オーバーハング"],
      ["7", "表土浮きだし分離"],
      ["8", "節理の形状"],
      ["9", "木根の浸食"],
      ["10", "崩壊地、沢、道路際"]
    ],
    B: [
      ["1", "亀裂、空隙、分離状況"],
      ["2", "全般コメント"],
      ["3", "底面勾配、前傾状況"],
      ["4", "まとまって落下、規模"],
      ["5", "広範囲に分布"],
      ["6", "切り立った露岩帯"],
      ["7", "下方に転石あり"],
      ["8", "表土から浮出し"],
      ["9", "立木下から浮出し"],
      ["10", "沢、道路際、崩壊跡"]
    ]
  },
  rolling: {
    A: [
      ["1", "停止状況 (浮出)"],
      ["2", "停止状況 (滑落)"],
      ["3", "露出状況 (浮出)"],
      ["4", "露出状況 (滑落)"],
      ["5", "倒木で浮出、停止"],
      ["6", "折り重なり、不安定"],
      ["7", "露岩、石上で停止"],
      ["8", "立木下に浮出し"],
      ["9", "沢、崩壊跡で停止"],
      ["10", "道路際に浮出、停止"]
    ],
    B: [
      ["1", "石の底面勾配、空隙"],
      ["2", "全般コメント"],
      ["3", "石の停止状況、前傾"],
      ["4", "立木、表土変化で"],
      ["5", "まとまって落下、規模"],
      ["6", "周囲の転石分布"],
      ["7", "上方に発生源"],
      ["8", "風雨の影響が顕著"],
      ["9", "立木下に埋没"],
      ["10", "沢部、崩壊地形"]
    ]
  }
};

const fields = [
  { id: "height", label: "高さ", unit: "m", type: "decimal1", excel: "B" },
  { id: "width", label: "幅", unit: "m", type: "decimal1", excel: "C" },
  { id: "depth", label: "奥行", unit: "m", type: "decimal1", excel: "D" },
  { id: "count", label: "石個数", unit: "個", type: "integer", excel: "E" },
  { id: "rockSlope", label: "石勾配", unit: "°", type: "integer", excel: "F", output: "decimalTenth" },
  { id: "slope", label: "斜面勾配", unit: "°", type: "integer", excel: "G", output: "decimalTenth" },
  {
    id: "stoneType",
    label: "落石区分",
    unit: "",
    type: "choice",
    choices: [
      { value: "rolling", label: "転石" },
      { value: "floating", label: "浮石" }
    ]
  },
  { id: "stability", label: "安定度", unit: "", type: "choice", choices: ["1", "2", "3", "4", "5"] },
  { id: "commentA", label: "写真帳 A", unit: "", type: "comment", commentGroup: "A", excel: "J", requiresStoneType: true },
  { id: "commentB", label: "写真帳 B", unit: "", type: "comment", commentGroup: "B", excel: "K", requiresStoneType: true },
  { id: "workType", label: "予防工", unit: "", type: "choice", choices: ["0", "1", "2", "3", "4"], excel: "L" },
  { id: "workRangeA", label: "予防工 範囲A", unit: "m", type: "rangeChoice", excel: "M", quickValues: ["2", "4", "6", "8", "10", "12", "14", "16", "18", "20"], onlyWhen: { id: "workType", value: "3" } },
  { id: "workRangeB", label: "予防工 範囲B", unit: "m", type: "rangeChoice", excel: "N", quickValues: ["2", "4", "6", "8", "10", "12", "14", "16", "18", "20"], onlyWhen: { id: "workType", value: "3" } }
];

const exportFields = [
  ["NO", (record) => record.no],
  ["高さ", (record) => decimalLength(record.values.height)],
  ["幅", (record) => decimalLength(record.values.width)],
  ["奥行", (record) => decimalLength(record.values.depth)],
  ["石個数", (record) => record.values.count || ""],
  ["石勾配", (record) => slopeLength(record.values.rockSlope)],
  ["斜面勾配", (record) => slopeLength(record.values.slope)],
  ["転石", (record) => (record.values.stoneType === "rolling" ? record.values.stability || "" : "")],
  ["浮石", (record) => (record.values.stoneType === "floating" ? record.values.stability || "" : "")],
  ["A", (record) => record.values.commentA || ""],
  ["B", (record) => record.values.commentB || ""],
  ["予防工", (record) => record.values.workType || ""],
  ["予防工寸法A", (record) => (record.values.workType === "3" ? decimalLength(record.values.workRangeA) : "")],
  ["予防工寸法B", (record) => (record.values.workType === "3" ? decimalLength(record.values.workRangeB) : "")],
  ["その他", () => ""],
  ["写真ファイル名", (record) => (record.photos || []).map((photo) => photo.name).join(" / ")]
];

const legacyStorageKey = "rockfall-field-log-v2";
const legacyStorageKeyV1 = "rockfall-field-log-v1";
const legacySituationStorageKey = "rockfall-situation-photos-v1";
const sitesIndexKey = "rockfall-sites-index-v1";
const activeSiteKey = "rockfall-active-site-v1";
const appBackupVersion = 1;
let sites = loadSites();
let activeSiteId = localStorage.getItem(activeSiteKey) || sites[0]?.id || "";
let activeSite = getActiveSite();
let records = activeSite?.records || [];
let situationPhotos = activeSite?.situationPhotos || [];
let activeRecordIndex = 0;
let activeFieldIndex = 0;
let pendingPhoto = null;
let photoListMode = "";
let pendingPdfDocument = null;
let mapImageCache = null;
let mapImageCacheSrc = "";
let mapPlotMode = "rock";
let mapToolMode = "view";
let activeSituationIndex = 0;
let draggingMapPoint = null;
let scaleDraftPoint = null;
let measureDraftPoint = null;
let mapZoom = 1.1;
let mapPanelCollapsed = true;
let activeMapPointers = new Map();
let mapTouchGesture = null;
let mapPinchGesture = null;
let mapLongPressTimer = 0;
let mapZoomFrame = 0;
let pendingMapZoomAnchor = null;

if (activeSite && activeSite.id !== activeSiteId) {
  bindActiveSite(activeSite.id);
}

const elements = {
  siteButton: document.querySelector("#site-button"),
  siteName: document.querySelector("#site-name"),
  siteModal: document.querySelector("#site-modal"),
  siteInput: document.querySelector("#site-input"),
  createSite: document.querySelector("#create-site"),
  siteList: document.querySelector("#site-list"),
  closeSiteModal: document.querySelector("#close-site-modal"),
  backupSite: document.querySelector("#backup-site"),
  restoreSite: document.querySelector("#restore-site"),
  restoreInput: document.querySelector("#restore-input"),
  recordStrip: document.querySelector(".record-strip"),
  activeRecordLabel: document.querySelector("#active-record-label"),
  fieldList: document.querySelector("#field-list"),
  fieldLabel: document.querySelector("#field-label"),
  stepCount: document.querySelector("#step-count"),
  valueText: document.querySelector("#value-text"),
  valueUnit: document.querySelector("#value-unit"),
  quickRow: document.querySelector("#quick-row"),
  summaryCount: document.querySelector("#summary-count"),
  keypad: document.querySelector("#keypad"),
  clearField: document.querySelector("#clear-field"),
  newRecord: document.querySelector("#new-record"),
  exportCsv: document.querySelector("#export-csv"),
  mapButton: document.querySelector("#map-button"),
  mapModal: document.querySelector("#map-modal"),
  mapPanel: document.querySelector("#map-panel"),
  mapControlsToggle: document.querySelector("#map-controls-toggle"),
  closeMap: document.querySelector("#close-map"),
  selectMap: document.querySelector("#select-map"),
  mapInput: document.querySelector("#map-input"),
  mapStageWrap: document.querySelector(".map-stage-wrap"),
  mapCanvas: document.querySelector("#map-canvas"),
  mapCrosshair: document.querySelector("#map-crosshair"),
  mapStatus: document.querySelector("#map-status"),
  mapPageRow: document.querySelector("#map-page-row"),
  mapPageSelect: document.querySelector("#map-page-select"),
  mapEditToggle: document.querySelector("#map-edit-toggle"),
  mapScaleTool: document.querySelector("#map-scale-tool"),
  mapMeasureTool: document.querySelector("#map-measure-tool"),
  mapRockMode: document.querySelector("#map-rock-mode"),
  mapSituationMode: document.querySelector("#map-situation-mode"),
  mapRockRow: document.querySelector("#map-rock-row"),
  mapRecordSelect: document.querySelector("#map-record-select"),
  mapPrevRecord: document.querySelector("#map-prev-record"),
  mapNextRecord: document.querySelector("#map-next-record"),
  mapAddRecord: document.querySelector("#map-add-record"),
  mapSituationRow: document.querySelector("#map-situation-row"),
  mapSituationSelect: document.querySelector("#map-situation-select"),
  mapPlacePoint: document.querySelector("#map-place-point"),
  clearMapPoint: document.querySelector("#clear-map-point"),
  exportMap: document.querySelector("#export-map"),
  mapZoomOut: document.querySelector("#map-zoom-out"),
  mapZoomFit: document.querySelector("#map-zoom-fit"),
  mapZoomIn: document.querySelector("#map-zoom-in"),
  photoButton: document.querySelector("#photo-button"),
  photoMenu: document.querySelector("#photo-menu"),
  cameraInput: document.querySelector("#camera-input"),
  photoPanel: document.querySelector("#photo-panel"),
  photoMeta: document.querySelector("#photo-meta"),
  photoList: document.querySelector("#photo-list"),
  toggleRockList: document.querySelector("#toggle-rock-list"),
  toggleSituationList: document.querySelector("#toggle-situation-list"),
  exportPhotos: document.querySelector("#export-photos"),
  situationPhoto: document.querySelector("#situation-photo")
};

function loadSites() {
  try {
    const saved = JSON.parse(localStorage.getItem(sitesIndexKey) || "[]");
    if (Array.isArray(saved) && saved.length) return saved.map((site) => normalizeSite(site)).filter(Boolean);
  } catch {
    localStorage.removeItem(sitesIndexKey);
  }
  return migrateLegacySite();
}

function migrateLegacySite() {
  const legacyRecords = loadLegacyRecords();
  const legacySituations = loadLegacySituationPhotos();
  const hasLegacy =
    localStorage.getItem(legacyStorageKey) ||
    localStorage.getItem(legacyStorageKeyV1) ||
    localStorage.getItem(legacySituationStorageKey);
  if (!hasLegacy) return [];
  const site = normalizeSite({
    id: createSiteId(),
    name: "未設定現場",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    records: legacyRecords,
    situationPhotos: legacySituations
  }, false);
  saveSitesIndex([site]);
  localStorage.setItem(activeSiteKey, site.id);
  saveSiteData(site);
  return [site];
}

function loadLegacyRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(legacyStorageKey) || localStorage.getItem(legacyStorageKeyV1));
    if (Array.isArray(saved) && saved.length) return saved.map(normalizeRecord);
  } catch {
    localStorage.removeItem(legacyStorageKey);
  }
  return [createRecord(1)];
}

function loadLegacySituationPhotos() {
  try {
    const saved = JSON.parse(localStorage.getItem(legacySituationStorageKey));
    if (Array.isArray(saved)) return saved;
  } catch {
    localStorage.removeItem(legacySituationStorageKey);
  }
  return [];
}

function normalizeSite(site, useStored = true) {
  if (!site || !site.id || !site.name) return null;
  const stored = useStored ? loadSiteData(site.id) : null;
  const recordsSource = stored?.records || site.records || [createRecord(1)];
  const situationSource = stored?.situationPhotos || site.situationPhotos || [];
  const mapSource = stored?.map || site.map || null;
  return {
    id: site.id,
    name: site.name,
    createdAt: site.createdAt || new Date().toISOString(),
    updatedAt: site.updatedAt || new Date().toISOString(),
    records: recordsSource.map(normalizeRecord),
    situationPhotos: Array.isArray(situationSource) ? situationSource : [],
    map: normalizeMap(mapSource)
  };
}

function siteDataKey(siteId) {
  return `rockfall-site-data-v1:${siteId}`;
}

function loadSiteData(siteId) {
  try {
    return JSON.parse(localStorage.getItem(siteDataKey(siteId)) || "null");
  } catch {
    return null;
  }
}

function saveSitesIndex(nextSites = sites) {
  const index = nextSites.map(({ id, name, createdAt, updatedAt }) => ({ id, name, createdAt, updatedAt }));
  localStorage.setItem(sitesIndexKey, JSON.stringify(index));
}

function saveSiteData(site = activeSite) {
  if (!site) return;
  site.updatedAt = new Date().toISOString();
  const payload = JSON.stringify({
    records: site.records,
    situationPhotos: site.situationPhotos,
    map: site.map || null
  });
  try {
    localStorage.setItem(siteDataKey(site.id), payload);
  } catch {
    return false;
  }
  saveSitesIndex();
  return true;
}

function getActiveSite() {
  return sites.find((site) => site.id === activeSiteId) || sites[0] || null;
}

function bindActiveSite(siteId) {
  activeSiteId = siteId;
  activeSite = getActiveSite();
  records = activeSite?.records || [];
  situationPhotos = activeSite?.situationPhotos || [];
  activeRecordIndex = 0;
  activeFieldIndex = 0;
  if (activeSite) localStorage.setItem(activeSiteKey, activeSite.id);
}

function createSiteId() {
  return `site-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSite(name) {
  const trimmed = sanitizeSiteName(name);
  if (!trimmed) return null;
  const site = normalizeSite({
    id: createSiteId(),
    name: trimmed,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    records: [createRecord(1)],
    situationPhotos: [],
    map: null
  }, false);
  sites.push(site);
  saveSitesIndex();
  saveSiteData(site);
  bindActiveSite(site.id);
  return site;
}

function sanitizeSiteName(value) {
  return String(value || "").trim();
}

function createRecord(no) {
  return normalizeRecord({ no, values: {} });
}

function normalizeRecord(record) {
  const values = { ...(record.values || {}) };
  for (const field of fields) {
    if (values[field.id] === undefined) values[field.id] = "";
  }
  if (values.rolling && !values.stoneType) {
    values.stoneType = "rolling";
    values.stability = values.rolling;
  }
  if (values.floating && !values.stoneType) {
    values.stoneType = "floating";
    values.stability = values.floating;
  }
  delete values.rolling;
  delete values.floating;
  delete values.other;
  const photos = Array.isArray(record.photos) ? record.photos : record.photo ? [{ ...record.photo, kind: "full" }] : [];
  return { no: record.no, values, photos, mapPoint: normalizeMapPoint(record.mapPoint) };
}

function normalizeMap(map) {
  if (!map || !map.dataUrl) return null;
  return {
    dataUrl: map.dataUrl,
    sourceName: map.sourceName || "等高線図",
    sourceType: map.sourceType || "image",
    width: Number(map.width) || 0,
    height: Number(map.height) || 0,
    pdfPage: map.pdfPage || "",
    scale: normalizeMapScale(map.scale),
    measure: normalizeMapMeasure(map.measure)
  };
}

function normalizeMapPoint(point) {
  const x = Number(point?.x);
  const y = Number(point?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y))
  };
}

function normalizeMapScale(scale) {
  const p1 = normalizeMapPoint(scale?.p1);
  const p2 = normalizeMapPoint(scale?.p2);
  const distance = Number(scale?.distance || 10);
  if (!p1 || !p2 || !Number.isFinite(distance) || distance <= 0) return null;
  return { p1, p2, distance };
}

function normalizeMapMeasure(measure) {
  const p1 = normalizeMapPoint(measure?.p1);
  const p2 = normalizeMapPoint(measure?.p2);
  if (!p1 || !p2) return null;
  return { p1, p2 };
}

function saveRecords() {
  if (!activeSite) return;
  activeSite.records = records;
  saveSiteData(activeSite);
}

function saveSituationPhotos() {
  if (!activeSite) return;
  activeSite.situationPhotos = situationPhotos;
  saveSiteData(activeSite);
}

function currentRecord() {
  if (!records.length) records.push(createRecord(1));
  return records[activeRecordIndex];
}

function visibleFields() {
  const values = currentRecord().values;
  return fields.filter((field) => {
    if (field.requiresStoneType && !values.stoneType) return false;
    return !field.onlyWhen || values[field.onlyWhen.id] === field.onlyWhen.value;
  });
}

function currentField() {
  const visible = visibleFields();
  if (!visible.some((field) => field.id === fields[activeFieldIndex].id)) {
    activeFieldIndex = fields.indexOf(visible[0]);
  }
  return fields[activeFieldIndex];
}

function currentVisibleIndex() {
  return visibleFields().findIndex((field) => field.id === currentField().id);
}

function currentValue() {
  return currentRecord().values[currentField().id] || "";
}

function setCurrentValue(value) {
  const field = currentField();
  currentRecord().values[field.id] = value;
  if (field.id === "stoneType") {
    currentRecord().values.stability = "";
    currentRecord().values.commentA = "";
    currentRecord().values.commentB = "";
  }
  if (field.id === "workType" && value !== "3") {
    currentRecord().values.workRangeA = "";
    currentRecord().values.workRangeB = "";
  }
  saveRecords();
  render();
}

function render() {
  renderSite();
  if (!activeSite) {
    openSiteModal(true);
    return;
  }
  renderRecords();
  renderFocus();
  renderFieldList();
  renderSummary();
  renderPhoto();
  if (!elements.mapModal.hidden) renderMap();
}

function renderSite() {
  elements.siteName.textContent = activeSite?.name || "未設定";
  elements.siteList.innerHTML = sites
    .map((site) => {
      const active = site.id === activeSiteId ? " / 選択中" : "";
      const count = site.records?.length || 0;
      return `
        <button class="site-option" type="button" data-site-id="${site.id}">
          <strong>${escapeHtml(site.name)}</strong>
          <span>${count}件${active}</span>
        </button>
      `;
    })
    .join("");
  elements.closeSiteModal.hidden = !activeSite;
}

function renderRecords() {
  elements.activeRecordLabel.textContent = `現在入力中: No.${currentRecord().no}`;
  elements.recordStrip.innerHTML = records
    .map((record, index) => {
      const active = index === activeRecordIndex ? " active" : "";
      return `<button class="record-pill${active}" type="button" data-record-index="${index}">No.${record.no}</button>`;
    })
    .join("");
}

function renderFocus() {
  const field = currentField();
  const visible = visibleFields();
  const value = currentValue();
  document.body.classList.toggle("keypad-hidden", !isNumericField(field));
  elements.fieldLabel.textContent = field.label;
  elements.stepCount.textContent = `${currentVisibleIndex() + 1} / ${visible.length}`;
  elements.valueText.textContent = displayValue(field, value, true);
  elements.valueText.classList.toggle("empty", !value);
  elements.valueText.classList.toggle("long-value", field.type === "comment" && Boolean(value));
  elements.valueUnit.textContent = value && field.unit ? field.unit : "";
  elements.quickRow.className = "quick-row";
  elements.quickRow.innerHTML = "";

  if (field.type === "choice") renderChoiceButtons(field, value);
  if (field.type === "comment") renderCommentButtons(field, value);
  if (field.quickValues) renderQuickValues(field, value);
}

function renderChoiceButtons(field, value) {
  elements.quickRow.innerHTML = field.choices
    .map((choice) => {
      const option = typeof choice === "string" ? { value: choice, label: choice } : choice;
      const selected = option.value === value ? " selected" : "";
      return `<button class="${selected}" type="button" data-choice="${option.value}">${option.label}</button>`;
    })
    .join("");
}

function renderCommentButtons(field, value) {
  const choices = commentChoicesForField(field);
  elements.quickRow.classList.add("comment-options");
  elements.quickRow.innerHTML = choices
    .map(([code, text]) => {
      const selected = code === value ? " selected" : "";
      return `
        <button class="comment-choice${selected}" type="button" data-choice="${code}">
          <span class="comment-code">${code}</span>
          <span class="comment-text">${text}</span>
        </button>
      `;
    })
    .join("");
}

function renderQuickValues(field, value) {
  elements.quickRow.innerHTML = field.quickValues
    .map((choice) => {
      const normalized = Number(choice).toFixed(1);
      const selected = normalized === value ? " selected" : "";
      return `<button class="${selected}" type="button" data-quick-value="${normalized}">${normalized}</button>`;
    })
    .join("");
}

function renderFieldList() {
  elements.fieldList.innerHTML = visibleFields()
    .map((field, index) => {
      const value = currentRecord().values[field.id] || "";
      const active = field.id === currentField().id ? " active" : "";
      return `
        <button class="field-row${active}" type="button" data-field-id="${field.id}">
          <span class="field-number">${String(index + 1).padStart(2, "0")}</span>
          <span class="field-name">${field.label}</span>
          <span class="field-value">${displayValue(field, value, false)}</span>
        </button>
      `;
    })
    .join("");
}

function renderSummary() {
  const values = currentRecord().values;
  const visible = visibleFields();
  const filled = visible.filter((field) => values[field.id]).length;
  elements.summaryCount.textContent = `${filled} / ${visible.length}`;
}

function renderPhoto() {
  const recordPhotos = currentRecord().photos || [];
  const rockTotal = records.reduce((sum, record) => sum + (record.photos?.length || 0), 0);
  const total = rockTotal + situationPhotos.length;
  elements.photoMeta.textContent = `このNo: ${recordPhotos.length}枚 / 状況: ${situationPhotos.length}枚 / 全体: ${total}枚`;
  elements.toggleRockList.textContent = photoListMode === "rock" ? "落石閉じる" : "落石一覧";
  elements.toggleSituationList.textContent = photoListMode === "situation" ? "状況閉じる" : "状況一覧";
  elements.photoList.hidden = !photoListMode;
  if (photoListMode === "rock") {
    elements.photoList.innerHTML =
      recordPhotos.map((photo, index) => photoListItem(photo, index, "rock")).join("") ||
      `<p class="empty-photo">このNoの写真は未撮影</p>`;
    return;
  }
  if (photoListMode === "situation") {
    elements.photoList.innerHTML =
      situationPhotos.map((photo, index) => photoListItem(photo, index, "situation")).join("") ||
      `<p class="empty-photo">状況写真は未撮影</p>`;
    return;
  }
  elements.photoList.innerHTML = "";
}

async function renderMap() {
  if (elements.mapModal.hidden) return;
  const map = activeSite?.map;
  normalizeActiveSituationIndex();
  renderMapModeControls();
  const rockPlaced = records.filter((record) => record.mapPoint).length;
  const situationPlaced = situationPhotos.filter((photo) => photo.mapPoint).length;
  const targetText = mapPlotMode === "rock"
    ? `落石番号: ${currentRecord().no}`
    : `状況写真: ${situationLabel(currentSituationPhoto(), activeSituationIndex)}`;
  const helperText = mapHelperStatus();
  elements.mapStatus.textContent = map
    ? `${targetText} / 落石 ${rockPlaced}件 / 状況 ${situationPlaced}件 / ${helperText} / ${map.sourceName}${map.pdfPage ? ` ${map.pdfPage}ページ` : ""}`
    : "図面を選択してください。";
  elements.clearMapPoint.disabled = !currentMapTarget()?.mapPoint;
  elements.exportMap.disabled = !map;
  elements.mapPanel.classList.toggle("collapsed", mapPanelCollapsed);
  elements.mapControlsToggle.textContent = mapPanelCollapsed ? "操作" : "隠す";
  elements.mapModal.classList.toggle("map-editing", mapToolMode === "edit");
  await drawMapCanvas();
}

function renderMapModeControls() {
  elements.mapEditToggle.classList.toggle("selected", mapToolMode === "edit");
  elements.mapEditToggle.textContent = mapToolMode === "edit" ? "編集ON" : "編集OFF";
  elements.mapPlacePoint.classList.toggle("selected", mapToolMode === "edit");
  elements.mapPlacePoint.disabled = mapToolMode !== "edit";
  elements.mapPlacePoint.textContent = currentMapTarget()?.mapPoint ? "十字へ移動" : "十字に配置";
  elements.mapScaleTool.classList.toggle("selected", mapToolMode === "scale");
  elements.mapMeasureTool.classList.toggle("selected", mapToolMode === "measure");
  elements.mapRockMode.classList.toggle("selected", mapPlotMode === "rock");
  elements.mapSituationMode.classList.toggle("selected", mapPlotMode === "situation");
  elements.mapRockRow.hidden = mapPlotMode !== "rock";
  elements.mapSituationRow.hidden = mapPlotMode !== "situation";
  elements.mapCrosshair.hidden = mapToolMode !== "edit";
  elements.mapRecordSelect.innerHTML = records
    .map((record, index) => `<option value="${index}">${record.no}${record.mapPoint ? " *" : ""}</option>`)
    .join("");
  elements.mapRecordSelect.value = String(activeRecordIndex);
  elements.mapPrevRecord.disabled = activeRecordIndex <= 0;
  elements.mapNextRecord.disabled = activeRecordIndex >= records.length - 1;
  elements.mapSituationSelect.innerHTML = situationPhotos
    .map((photo, index) => `<option value="${index}">${escapeHtml(situationLabel(photo, index))}</option>`)
    .join("");
  if (situationPhotos.length) elements.mapSituationSelect.value = String(activeSituationIndex);
}

function mapHelperStatus() {
  if (!activeSite?.map) return "";
  if (mapToolMode === "edit") return "編集ON: 十字に合わせて配置 / 1本指で移動 / 2本指で拡大縮小";
  if (mapToolMode === "scale") return scaleDraftPoint ? "10m基準: 終点をタップ" : "10m基準: 始点をタップ";
  if (mapToolMode === "measure") {
    if (measureDraftPoint) return "距離確認: 終点をタップ";
    const distance = mapDistanceMeters(activeSite.map.measure);
    return distance ? `距離確認: 約${distance.toFixed(1)}m` : "距離確認: 始点をタップ";
  }
  const scaleDistance = mapPointPixelDistance(activeSite.map.scale);
  return scaleDistance ? "ロック中: 1本指で移動 / 2本指で拡大縮小 / 10m基準: 登録済" : "ロック中: 1本指で移動 / 2本指で拡大縮小 / 10m基準: 未設定";
}

async function drawMapCanvas() {
  const canvas = elements.mapCanvas;
  const context = canvas.getContext("2d");
  const wrap = elements.mapStageWrap;
  const map = activeSite?.map;
  const width = Math.max(1, wrap.clientWidth || 320);
  const height = Math.max(1, wrap.clientHeight || 220);
  const pixelRatio = window.devicePixelRatio || 1;

  if (!map) {
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#f7faf8";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#65726c";
    context.font = "800 18px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("図面を選択してください", width / 2, height / 2);
    return;
  }

  const image = await mapImage();
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight) * mapZoom;
  const displayWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const displayHeight = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  canvas.width = Math.round(displayWidth * pixelRatio);
  canvas.height = Math.round(displayHeight * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, displayWidth, displayHeight);
  context.drawImage(image, 0, 0, displayWidth, displayHeight);
  drawMapHelpers(context, displayWidth, displayHeight);
  drawMapPoints(context, displayWidth, displayHeight, pixelRatio);
}

async function mapImage() {
  const dataUrl = activeSite?.map?.dataUrl || "";
  if (mapImageCache && mapImageCacheSrc === dataUrl) return mapImageCache;
  mapImageCache = await loadImage(dataUrl);
  mapImageCacheSrc = dataUrl;
  return mapImageCache;
}

function drawMapPoints(context, width, height) {
  records.forEach((record, index) => {
    if (!record.mapPoint) return;
    drawMapLabel(context, {
      x: record.mapPoint.x * width,
      y: record.mapPoint.y * height,
      label: String(record.no),
      active: mapPlotMode === "rock" && index === activeRecordIndex,
      color: "#0d6b55"
    });
  });
  situationPhotos.forEach((photo, index) => {
    if (!photo.mapPoint) return;
    drawMapLabel(context, {
      x: photo.mapPoint.x * width,
      y: photo.mapPoint.y * height,
      label: `状${index + 1}`,
      active: mapPlotMode === "situation" && index === activeSituationIndex,
      color: "#315f9c"
    });
  });
}

function drawMapHelpers(context, width, height) {
  const map = activeSite?.map;
  if (!map) return;
  if (map.scale) {
    drawMapLine(context, map.scale.p1, map.scale.p2, width, height, "#a94e17", "10m");
  }
  if (scaleDraftPoint) {
    drawMapHelperPoint(context, scaleDraftPoint, width, height, "#a94e17");
  }
  if (map.measure) {
    const distance = mapDistanceMeters(map.measure);
    drawMapLine(context, map.measure.p1, map.measure.p2, width, height, "#315f9c", distance ? `約${distance.toFixed(1)}m` : "測距");
  }
  if (measureDraftPoint) {
    drawMapHelperPoint(context, measureDraftPoint, width, height, "#315f9c");
  }
}

function drawMapLine(context, p1, p2, width, height, color, label) {
  const x1 = p1.x * width;
  const y1 = p1.y * height;
  const x2 = p2.x * width;
  const y2 = p2.y * height;
  context.save();
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.setLineDash([7, 5]);
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
  context.setLineDash([]);
  drawMapHelperPoint(context, p1, width, height, color);
  drawMapHelperPoint(context, p2, width, height, color);
  context.font = "900 13px system-ui, sans-serif";
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const textWidth = context.measureText(label).width + 12;
  context.fillStyle = "rgba(255, 255, 255, 0.7)";
  roundedRect(context, midX - textWidth / 2, midY - 11, textWidth, 22, 5);
  context.fill();
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, midX, midY);
  context.restore();
}

function drawMapHelperPoint(context, point, width, height, color) {
  context.save();
  context.fillStyle = "rgba(255, 255, 255, 0.72)";
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(point.x * width, point.y * height, 5, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawMapLabel(context, point) {
  const fontSize = point.active ? 9 : 8;
  const haloSize = point.active ? 13 : 10;
  context.save();
  context.font = `900 ${fontSize}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = point.active ? "rgba(255, 255, 255, 0.56)" : "rgba(255, 255, 255, 0.34)";
  context.beginPath();
  context.arc(point.x, point.y, haloSize / 2, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = point.active ? 2.2 : 1.7;
  context.strokeStyle = point.active ? "rgba(255, 255, 255, 0.88)" : "rgba(255, 255, 255, 0.7)";
  context.strokeText(point.label, point.x, point.y + 0.5);
  context.fillStyle = point.active ? point.color : `${point.color}cc`;
  context.fillText(point.label, point.x, point.y + 0.5);
  context.restore();
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function openMapModal() {
  normalizeFieldBeforeMove();
  closePhotoMenu();
  mapPanelCollapsed = true;
  resetMapTouchState();
  elements.mapModal.hidden = false;
  document.body.classList.add("map-open");
  requestAnimationFrame(() => renderMap());
}

function closeMapModal() {
  resetMapTouchState();
  elements.mapModal.hidden = true;
  document.body.classList.remove("map-open");
}

function currentSituationPhoto() {
  normalizeActiveSituationIndex();
  return situationPhotos[activeSituationIndex] || null;
}

function normalizeActiveSituationIndex() {
  if (!situationPhotos.length) {
    activeSituationIndex = 0;
    return;
  }
  activeSituationIndex = Math.max(0, Math.min(activeSituationIndex, situationPhotos.length - 1));
}

function situationLabel(photo, index) {
  if (!photo) return "未選択";
  return `${index + 1}: ${photo.folder || photo.name || "状況写真"}`;
}

function currentMapTarget() {
  return mapPlotMode === "situation" ? currentSituationPhoto() : currentRecord();
}

function saveCurrentMapTarget() {
  if (mapPlotMode === "situation") {
    saveSituationPhotos();
    return;
  }
  saveRecords();
}

function setMapPlotMode(mode) {
  mapPlotMode = mode;
  if (mapToolMode === "edit") mapToolMode = "view";
  renderMap();
}

function setMapToolMode(mode) {
  mapToolMode = mode;
  scaleDraftPoint = null;
  measureDraftPoint = null;
  mapPanelCollapsed = true;
  renderMap();
}

function toggleMapEdit() {
  mapToolMode = mapToolMode === "edit" ? "view" : "edit";
  scaleDraftPoint = null;
  measureDraftPoint = null;
  mapPanelCollapsed = true;
  renderMap();
}

function toggleMapPanel() {
  mapPanelCollapsed = !mapPanelCollapsed;
  renderMap();
}

function changeMapZoom(delta) {
  const anchorClient = mapViewportClientPoint();
  const anchorPoint = normalizeMapPoint(mapCanvasPoint(anchorClient));
  setMapZoomValue(mapZoom + delta, anchorPoint, anchorClient);
}

function fitMapZoom() {
  const anchorClient = mapViewportClientPoint();
  const anchorPoint = normalizeMapPoint(mapCanvasPoint(anchorClient));
  setMapZoomValue(1, anchorPoint, anchorClient);
}

function selectMapRecord(index) {
  activeRecordIndex = Math.max(0, Math.min(Number(index) || 0, records.length - 1));
  activeFieldIndex = 0;
  mapPlotMode = "rock";
  render();
}

function addRecordFromMap() {
  addRecord();
  mapPlotMode = "rock";
  mapToolMode = "edit";
  openMapModal();
}

function mapViewportClientPoint() {
  const rect = elements.mapStageWrap.getBoundingClientRect();
  return {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2
  };
}

function mapCrosshairClientPoint() {
  const crosshairRect = elements.mapCrosshair.getBoundingClientRect();
  if (!crosshairRect.width || !crosshairRect.height) return mapViewportClientPoint();
  return {
    clientX: crosshairRect.left + crosshairRect.width / 2,
    clientY: crosshairRect.top + crosshairRect.height / 2
  };
}

function preserveMapViewport(anchorPoint, anchorClient) {
  if (!anchorPoint || !anchorClient) return;
  const stage = elements.mapStageWrap;
  const canvas = elements.mapCanvas;
  if (!stage || !canvas.clientWidth || !canvas.clientHeight) return;
  const stageRect = stage.getBoundingClientRect();
  const offsetX = anchorClient.clientX - stageRect.left;
  const offsetY = anchorClient.clientY - stageRect.top;
  const contentX = canvas.offsetLeft + anchorPoint.x * canvas.clientWidth;
  const contentY = canvas.offsetTop + anchorPoint.y * canvas.clientHeight;
  stage.scrollLeft = Math.max(0, contentX - offsetX);
  stage.scrollTop = Math.max(0, contentY - offsetY);
}

function queueMapZoomRender() {
  if (mapZoomFrame) return;
  mapZoomFrame = requestAnimationFrame(async () => {
    mapZoomFrame = 0;
    const anchor = pendingMapZoomAnchor;
    pendingMapZoomAnchor = null;
    await renderMap();
    if (anchor) preserveMapViewport(anchor.point, anchor.client);
  });
}

function setMapZoomValue(nextZoom, anchorPoint, anchorClient) {
  const clamped = Math.max(0.8, Math.min(5, Number(nextZoom.toFixed(2))));
  if (Math.abs(clamped - mapZoom) < 0.01) return;
  mapZoom = clamped;
  pendingMapZoomAnchor = anchorPoint && anchorClient ? { point: anchorPoint, client: anchorClient } : null;
  queueMapZoomRender();
}

function mapPointPixelDistance(line) {
  if (!line?.p1 || !line?.p2) return 0;
  const map = activeSite?.map;
  if (!map?.width || !map?.height) return 0;
  const dx = (line.p2.x - line.p1.x) * map.width;
  const dy = (line.p2.y - line.p1.y) * map.height;
  return Math.hypot(dx, dy);
}

function mapDistanceMeters(line) {
  const scalePixels = mapPointPixelDistance(activeSite?.map?.scale);
  const measurePixels = mapPointPixelDistance(line);
  const scaleMeters = Number(activeSite?.map?.scale?.distance || 10);
  if (!scalePixels || !measurePixels || !Number.isFinite(scaleMeters)) return 0;
  return measurePixels / scalePixels * scaleMeters;
}

async function handleMapFile(file) {
  if (!file || !activeSite) return;
  try {
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      await loadPdfMap(file);
      return;
    }
    pendingPdfDocument = null;
    elements.mapPageRow.hidden = true;
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(dataUrl);
    await setSiteMap({
      dataUrl,
      sourceName: file.name || "等高線図",
      sourceType: "image",
      width: image.naturalWidth,
      height: image.naturalHeight,
      pdfPage: ""
    });
  } catch {
    window.alert("図面を読み込めませんでした。");
  }
}

async function setSiteMap(map) {
  activeSite.map = normalizeMap(map);
  mapImageCache = null;
  mapImageCacheSrc = "";
  mapZoom = map.sourceType === "pdf" ? 1.1 : 1.05;
  if (!saveSiteData(activeSite)) {
    const compressed = await compressedMap(activeSite.map);
    activeSite.map = compressed;
    if (!saveSiteData(activeSite)) {
      activeSite.map = null;
      window.alert("図面の保存容量が大きすぎます。画像を小さくしてから選択してください。");
      renderMap();
      return;
    }
    window.alert("図面が大きいため、端末内保存用に圧縮して保存しました。");
  }
  renderMap();
}

async function compressedMap(map) {
  const image = await loadImage(map.dataUrl);
  const maxSide = 2000;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return normalizeMap({
    ...map,
    dataUrl: canvas.toDataURL("image/jpeg", 0.82),
    width: canvas.width,
    height: canvas.height
  });
}

async function loadPdfMap(file) {
  const pdf = await getPdfDocument(file);
  pendingPdfDocument = { pdf, sourceName: file.name || "等高線図.pdf" };
  elements.mapPageSelect.innerHTML = Array.from({ length: pdf.numPages }, (_, index) => {
    const page = index + 1;
    return `<option value="${page}">${page}ページ</option>`;
  }).join("");
  elements.mapPageRow.hidden = false;
  await renderPdfPageToMap(1);
}

async function getPdfDocument(file) {
  await ensurePdfJs();
  const data = await file.arrayBuffer();
  return window.pdfjsLib.getDocument({ data }).promise;
}

async function ensurePdfJs() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.min.js";
    return;
  }
  await loadScript("pdf.min.js");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.min.js";
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => {
      window.alert("PDFを読み込むには pdf.min.js と pdf.worker.min.js をアプリフォルダに置いてください。");
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.append(script);
  });
}

async function renderPdfPageToMap(pageNumber) {
  if (!pendingPdfDocument) return;
  const page = await pendingPdfDocument.pdf.getPage(Number(pageNumber));
  const viewport = page.getViewport({ scale: 2.2 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context, viewport }).promise;
  await setSiteMap({
    dataUrl: canvas.toDataURL("image/png"),
    sourceName: pendingPdfDocument.sourceName,
    sourceType: "pdf",
    width: canvas.width,
    height: canvas.height,
    pdfPage: String(pageNumber)
  });
}

function mapCanvasPoint(event) {
  const rect = elements.mapCanvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    width: rect.width,
    height: rect.height
  };
}

function hitMapPoint(event) {
  const canvasPoint = mapCanvasPoint(event);
  const hitRange = 24;
  const candidates = [];
  records.forEach((record, index) => {
    if (record.mapPoint) candidates.push({ type: "rock", index, point: record.mapPoint });
  });
  situationPhotos.forEach((photo, index) => {
    if (photo.mapPoint) candidates.push({ type: "situation", index, point: photo.mapPoint });
  });
  return candidates
    .map((candidate) => {
      const dx = candidate.point.x - canvasPoint.x;
      const dy = candidate.point.y - canvasPoint.y;
      return { ...candidate, distance: Math.hypot(dx * canvasPoint.width, dy * canvasPoint.height) };
    })
    .filter((candidate) => candidate.distance <= hitRange)
    .sort((a, b) => a.distance - b.distance)[0] || null;
}

function selectHitMapPoint(hit) {
  if (!hit) return;
  if (hit.type === "rock") {
    mapPlotMode = "rock";
    activeRecordIndex = hit.index;
    activeFieldIndex = 0;
  } else {
    mapPlotMode = "situation";
    activeSituationIndex = hit.index;
  }
}

function setCurrentMapPoint(event) {
  if (!activeSite?.map) {
    window.alert("先に図面を選択してください。");
    return;
  }
  if (mapToolMode === "scale") {
    setMapScalePoint(event);
    return;
  }
  if (mapToolMode === "measure") {
    setMapMeasurePoint(event);
    return;
  }
  if (mapToolMode !== "edit") return;
  const target = currentMapTarget();
  if (!target) {
    window.alert("配置する状況写真がありません。先に状況写真を撮影してください。");
    return;
  }
  const point = mapCanvasPoint(event);
  if (!point.width || !point.height) return;
  target.mapPoint = normalizeMapPoint(point);
  saveCurrentMapTarget();
  renderMap();
}

function placeCurrentMapPointAtCrosshair() {
  if (!activeSite?.map) {
    window.alert("先に図面を選択してください。");
    return;
  }
  const target = currentMapTarget();
  if (!target) {
    window.alert("配置する状況写真がありません。先に状況写真を撮影してください。");
    return;
  }
  const point = normalizeMapPoint(mapCanvasPoint(mapCrosshairClientPoint()));
  target.mapPoint = point;
  saveCurrentMapTarget();
  renderMap();
}

function setMapScalePoint(event) {
  const point = normalizeMapPoint(mapCanvasPoint(event));
  if (!scaleDraftPoint) {
    scaleDraftPoint = point;
    renderMap();
    return;
  }
  activeSite.map.scale = { p1: scaleDraftPoint, p2: point, distance: 10 };
  scaleDraftPoint = null;
  saveSiteData(activeSite);
  renderMap();
}

function setMapMeasurePoint(event) {
  const point = normalizeMapPoint(mapCanvasPoint(event));
  if (!measureDraftPoint) {
    measureDraftPoint = point;
    renderMap();
    return;
  }
  activeSite.map.measure = { p1: measureDraftPoint, p2: point };
  measureDraftPoint = null;
  saveSiteData(activeSite);
  renderMap();
}

function resetMapTouchState() {
  if (mapLongPressTimer) clearTimeout(mapLongPressTimer);
  if (mapZoomFrame) cancelAnimationFrame(mapZoomFrame);
  mapLongPressTimer = 0;
  mapZoomFrame = 0;
  pendingMapZoomAnchor = null;
  activeMapPointers = new Map();
  mapTouchGesture = null;
  mapPinchGesture = null;
  draggingMapPoint = null;
}

function clearMapLongPress() {
  if (!mapLongPressTimer) return;
  clearTimeout(mapLongPressTimer);
  mapLongPressTimer = 0;
}

function mapTouchPoint(event) {
  return { clientX: event.clientX, clientY: event.clientY };
}

function mapTouchDistance(points) {
  return Math.hypot(points[0].clientX - points[1].clientX, points[0].clientY - points[1].clientY);
}

function mapTouchMidpoint(points) {
  return {
    clientX: (points[0].clientX + points[1].clientX) / 2,
    clientY: (points[0].clientY + points[1].clientY) / 2
  };
}

function canHandleTouchMap(event) {
  return event.pointerType === "touch";
}

function startMapTouchPointer(event) {
  if (!activeSite?.map) return;
  elements.mapCanvas.setPointerCapture?.(event.pointerId);
  activeMapPointers.set(event.pointerId, mapTouchPoint(event));
  if (activeMapPointers.size >= 2) {
    clearMapLongPress();
    draggingMapPoint = null;
    mapTouchGesture = null;
    const points = Array.from(activeMapPointers.values()).slice(0, 2);
    mapPinchGesture = {
      startZoom: mapZoom,
      startDistance: Math.max(1, mapTouchDistance(points))
    };
    return;
  }
  mapTouchGesture = {
    pointerId: event.pointerId,
    point: mapTouchPoint(event),
    startPoint: mapTouchPoint(event),
    startScrollLeft: elements.mapStageWrap.scrollLeft,
    startScrollTop: elements.mapStageWrap.scrollTop,
    hit: hitMapPoint(event),
    moved: false,
    longPressTriggered: false
  };
}

function moveMapTouchPointer(event) {
  if (!activeMapPointers.has(event.pointerId)) return;
  activeMapPointers.set(event.pointerId, mapTouchPoint(event));
  if (mapPinchGesture && activeMapPointers.size >= 2) {
    clearMapLongPress();
    const points = Array.from(activeMapPointers.values()).slice(0, 2);
    const midpoint = mapTouchMidpoint(points);
    const anchorPoint = normalizeMapPoint(mapCanvasPoint(midpoint));
    const distance = Math.max(1, mapTouchDistance(points));
    setMapZoomValue(mapPinchGesture.startZoom * (distance / mapPinchGesture.startDistance), anchorPoint, midpoint);
    return;
  }
  if (!mapTouchGesture || mapTouchGesture.pointerId !== event.pointerId) return;
  mapTouchGesture.point = mapTouchPoint(event);
  const dx = event.clientX - mapTouchGesture.startPoint.clientX;
  const dy = event.clientY - mapTouchGesture.startPoint.clientY;
  const movedEnough = Math.hypot(dx, dy) > 10;
  if (!movedEnough) return;
  clearMapLongPress();
  mapTouchGesture.moved = true;
  elements.mapStageWrap.scrollLeft = mapTouchGesture.startScrollLeft - dx;
  elements.mapStageWrap.scrollTop = mapTouchGesture.startScrollTop - dy;
}

function endMapTouchPointer(event) {
  if (activeMapPointers.has(event.pointerId)) {
    activeMapPointers.delete(event.pointerId);
    elements.mapCanvas.releasePointerCapture?.(event.pointerId);
  }
  clearMapLongPress();
  if (mapTouchGesture && mapTouchGesture.pointerId === event.pointerId && !mapTouchGesture.moved) {
    if (mapToolMode === "edit" || mapToolMode === "view") {
      const hit = mapTouchGesture.hit || hitMapPoint(event);
      if (hit) {
        selectHitMapPoint(hit);
        renderMap();
      }
    } else {
      setCurrentMapPoint(event);
    }
  }
  if (activeMapPointers.size < 2) mapPinchGesture = null;
  if (!activeMapPointers.size) mapTouchGesture = null;
}

function startMapPointer(event) {
  if (canHandleTouchMap(event)) {
    startMapTouchPointer(event);
    return;
  }
  if (!activeSite?.map) return;
  if (mapToolMode !== "edit") {
    setCurrentMapPoint(event);
    return;
  }
  const hit = hitMapPoint(event);
  if (hit) {
    selectHitMapPoint(hit);
    renderMap();
  }
}

function moveMapPointer(event) {
  if (canHandleTouchMap(event)) {
    moveMapTouchPointer(event);
    return;
  }
}

function endMapPointer(event) {
  if (canHandleTouchMap(event)) {
    endMapTouchPointer(event);
    return;
  }
}

function clearCurrentMapPoint() {
  const target = currentMapTarget();
  if (!target) return;
  target.mapPoint = null;
  saveCurrentMapTarget();
  renderMap();
}

async function exportMapImage() {
  if (!activeSite?.map) {
    window.alert("出力する図面がありません。");
    return;
  }
  const image = await mapImage();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  drawMapHelpers(context, canvas.width, canvas.height);
  drawMapPoints(context, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileSafeName(activeSite?.name || "未設定現場")}_落石位置図.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function photoListItem(photo, index, group) {
  const size = photo.compressedSize ? ` / ${formatBytes(photo.compressedSize)}` : "";
  const label = group === "rock" ? photoKindLabel(photo.kind) : `状況: ${photo.folder}`;
  return `
    <article class="photo-item">
      <img src="${photo.dataUrl}" alt="${label}">
      <div>
        <strong>${label}</strong>
        <span>${photo.name}${size}</span>
        <button class="photo-delete" type="button" data-photo-delete="${group}:${index}">削除...</button>
      </div>
    </article>
  `;
}

function displayValue(field, value, focus) {
  if (!value) return "未入力";
  if (field.type === "comment") {
    const match = commentChoicesForField(field).find(([code]) => code === value);
    if (!match) return value;
    return focus ? `${match[0]} ${match[1]}` : match[0];
  }
  if (field.id === "stoneType") return value === "rolling" ? "転石" : "浮石";
  return !focus && field.unit ? `${value}${field.unit}` : value;
}

function commentChoicesForField(field) {
  if (field.type !== "comment") return field.choices || [];
  const type = currentRecord().values.stoneType;
  const group = field.commentGroup || "A";
  return commentChoices[type]?.[group] || [];
}

function appendKey(key) {
  const field = currentField();
  if (field.type === "choice" || field.type === "comment") {
    setCurrentValue(key);
    moveField(1);
    return;
  }

  if (field.type === "decimal1") {
    setCurrentValue(appendDecimalKey(currentValue(), key));
    return;
  }

  if (key === ".") return;
  const value = currentValue();
  if (value.length >= 4) return;
  setCurrentValue(value === "0" ? key : value + key);
}

function isNumericField(field) {
  return field.type === "decimal1" || field.type === "integer";
}

function appendDecimalKey(value, key) {
  if (key === ".") return value.includes(".") ? value : `${value || "0"}.`;
  if (!/^\d$/.test(key)) return value;
  if (!value) return `${key}.`;
  const [integer, decimal = ""] = value.split(".");
  if (!value.includes(".")) return `${integer}${key}.`;
  if (decimal.length >= 1) return value;
  return `${integer}.${key}`;
}

function normalizeFieldBeforeMove() {
  const field = currentField();
  const value = currentValue();
  if (field.type === "decimal1" && value) {
    const normalized = value.endsWith(".") ? `${value}0` : value;
    currentRecord().values[field.id] = normalized;
    saveRecords();
  }
}

function backspace() {
  const value = currentValue();
  if (currentField().type === "decimal1" && value.endsWith(".")) {
    setCurrentValue(value.slice(0, -2));
    return;
  }
  setCurrentValue(value.slice(0, -1));
}

function moveField(delta) {
  normalizeFieldBeforeMove();
  const visible = visibleFields();
  const nextVisibleIndex = Math.max(0, Math.min(visible.length - 1, currentVisibleIndex() + delta));
  activeFieldIndex = fields.indexOf(visible[nextVisibleIndex]);
  render();
}

function addRecord() {
  normalizeFieldBeforeMove();
  const nextNo = records.length ? Math.max(...records.map((record) => record.no)) + 1 : 1;
  records.push(createRecord(nextNo));
  activeRecordIndex = records.length - 1;
  activeFieldIndex = 0;
  saveRecords();
  render();
}

function exportCsv() {
  normalizeFieldBeforeMove();
  const headers = exportFields.map(([label]) => label);
  const rows = records.map((record, index) => exportFields.map(([, getter]) => getter(record, index)));
  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileSafeName(activeSite?.name || "未設定現場")}_落石入力シート.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportBackup() {
  if (!activeSite) return;
  normalizeFieldBeforeMove();
  const backup = {
    app: "rockfall-field-log",
    version: appBackupVersion,
    exportedAt: new Date().toISOString(),
    site: {
      id: activeSite.id,
      name: activeSite.name,
      createdAt: activeSite.createdAt,
      updatedAt: activeSite.updatedAt,
      records,
      situationPhotos,
      map: activeSite.map || null
    }
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileSafeName(activeSite.name)}_落石バックアップ.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function restoreBackup(file) {
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    const restoredSite = normalizeBackupSite(backup);
    const existingIndex = sites.findIndex((site) => site.id === restoredSite.id);
    if (existingIndex >= 0 && !window.confirm("同じ現場のバックアップがあります。現在の端末内データを上書きしますか？")) {
      return;
    }
    if (existingIndex >= 0) {
      sites[existingIndex] = restoredSite;
    } else {
      sites.push(restoredSite);
    }
    saveSitesIndex();
    saveSiteData(restoredSite);
    bindActiveSite(restoredSite.id);
    closeSiteModal();
    render();
  } catch {
    window.alert("バックアップファイルを読み込めませんでした。");
  }
}

function normalizeBackupSite(backup) {
  const source = backup?.site || backup;
  if (!source || !source.name || !Array.isArray(source.records)) throw new Error("Invalid backup");
  return normalizeSite({
    id: source.id || createSiteId(),
    name: sanitizeSiteName(source.name),
    createdAt: source.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    records: source.records,
    situationPhotos: source.situationPhotos || [],
    map: source.map || null
  }, false);
}

function decimalLength(value) {
  if (!value) return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return numeric.toFixed(1);
}

function slopeLength(value) {
  if (!value) return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return (numeric / 10).toFixed(1);
}

async function handlePhoto(file) {
  if (!file) return;
  const sourceUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceUrl);
  const dataUrl = createLightPhoto(image);
  const takenAt = new Date().toISOString();
  const photo = {
    kind: pendingPhoto?.kind || "full",
    name: photoFileName(pendingPhoto, takenAt),
    dataUrl,
    takenAt,
    originalSize: file.size,
    compressedSize: estimateDataUrlBytes(dataUrl)
  };
  if (pendingPhoto?.kind === "situation") {
    situationPhotos.push({ ...photo, folder: pendingPhoto.folder });
    saveSituationPhotos();
  } else {
    currentRecord().photos.push(photo);
    saveRecords();
  }
  pendingPhoto = null;
  render();
}

function createLightPhoto(image) {
  const maxWidth = 1280;
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function formatDateTime(value) {
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function photoFileName(photo, takenAt) {
  if (photo?.kind === "situation") {
    const index = situationPhotos.filter((item) => item.folder === photo.folder).length + 1;
    return `${String(index).padStart(2, "0")}.jpg`;
  }
  const record = currentRecord();
  const sameKindCount = record.photos.filter((item) => item.kind === photo?.kind).length + 1;
  return `${String(sameKindCount).padStart(2, "0")}.jpg`;
}

function photoKindLabel(kind) {
  if (kind === "shape") return "縦横";
  if (kind === "depth") return "奥行";
  if (kind === "situation") return "状況";
  return "全景";
}

function sanitizeName(value) {
  return String(value || "状況写真").replace(/[\\/:*?"<>|]/g, "_").trim() || "状況写真";
}

function fileSafeName(value) {
  return String(value || "未設定現場").replace(/[\\/:*?"<>|]/g, "_").trim() || "未設定現場";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function estimateDataUrlBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round(base64.length * 0.75);
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function exportPhotoZip() {
  const entries = [];
  for (const record of records) {
    for (const photo of record.photos || []) {
      entries.push({
        path: `${fileSafeName(activeSite?.name || "未設定現場")}/${record.no}/${photo.name}`,
        bytes: dataUrlToBytes(photo.dataUrl)
      });
    }
  }
  for (const photo of situationPhotos) {
    entries.push({
      path: `${fileSafeName(activeSite?.name || "未設定現場")}/${sanitizeName(photo.folder)}/${photo.name}`,
      bytes: dataUrlToBytes(photo.dataUrl)
    });
  }
  if (!entries.length) {
    window.alert("出力する写真がありません。");
    return;
  }
  const blob = makeZip(entries);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileSafeName(activeSite?.name || "未設定現場")}_落石写真.zip`;
  link.click();
  URL.revokeObjectURL(url);
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function makeZip(entries) {
  const files = [];
  const central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = utf8Bytes(entry.path);
    const crc = crc32(entry.bytes);
    const local = concatBytes(
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(entry.bytes.length), u32(entry.bytes.length),
      u16(name.length), u16(0), name, entry.bytes
    );
    files.push(local);
    central.push(concatBytes(
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(entry.bytes.length), u32(entry.bytes.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name
    ));
    offset += local.length;
  }
  const centralBytes = concatBytes(...central);
  const end = concatBytes(
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralBytes.length), u32(offset), u16(0)
  );
  return new Blob([concatBytes(...files, centralBytes, end)], { type: "application/zip" });
}

function utf8Bytes(text) {
  return new TextEncoder().encode(text);
}

function u16(value) {
  return new Uint8Array([value & 255, (value >>> 8) & 255]);
}

function u32(value) {
  return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
}

function concatBytes(...parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  }
  return (crc ^ -1) >>> 0;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function csvCell(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function openSiteModal(force = false) {
  elements.siteModal.hidden = false;
  elements.closeSiteModal.hidden = force || !activeSite;
  elements.siteInput.focus();
  renderSite();
}

function closeSiteModal() {
  if (!activeSite) return;
  elements.siteModal.hidden = true;
}

function handleCreateSite() {
  const site = createSite(elements.siteInput.value);
  if (!site) {
    window.alert("現場名を入力してください。");
    return;
  }
  elements.siteInput.value = "";
  closeSiteModal();
  render();
}

elements.siteButton.addEventListener("click", () => openSiteModal(false));
elements.createSite.addEventListener("click", handleCreateSite);
elements.siteInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") handleCreateSite();
});
elements.closeSiteModal.addEventListener("click", closeSiteModal);
elements.siteList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-site-id]");
  if (!button) return;
  normalizeFieldBeforeMove();
  bindActiveSite(button.dataset.siteId);
  closeSiteModal();
  render();
});
elements.backupSite.addEventListener("click", exportBackup);
elements.restoreSite.addEventListener("click", () => elements.restoreInput.click());
elements.restoreInput.addEventListener("change", (event) => {
  restoreBackup(event.target.files[0]);
  event.target.value = "";
});

elements.keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const key = button.dataset.key;
  const action = button.dataset.action;
  if (key) appendKey(key);
  if (action === "back") backspace();
  if (action === "prev") moveField(-1);
  if (action === "next" || action === "done") moveField(1);
});

elements.quickRow.addEventListener("click", (event) => {
  const quick = event.target.closest("button[data-quick-value]");
  if (quick) {
    setCurrentValue(quick.dataset.quickValue);
    moveField(1);
    return;
  }
  const button = event.target.closest("button[data-choice]");
  if (!button) return;
  setCurrentValue(button.dataset.choice);
  moveField(1);
});

elements.fieldList.addEventListener("click", (event) => {
  const row = event.target.closest("[data-field-id]");
  if (!row) return;
  normalizeFieldBeforeMove();
  activeFieldIndex = fields.findIndex((field) => field.id === row.dataset.fieldId);
  render();
});

elements.recordStrip.addEventListener("click", (event) => {
  const pill = event.target.closest("[data-record-index]");
  if (!pill) return;
  normalizeFieldBeforeMove();
  closePhotoMenu();
  activeRecordIndex = Number(pill.dataset.recordIndex);
  activeFieldIndex = 0;
  render();
});

elements.clearField.addEventListener("click", () => setCurrentValue(""));
elements.newRecord.addEventListener("click", addRecord);
elements.exportCsv.addEventListener("click", exportCsv);
elements.mapButton.addEventListener("click", openMapModal);
elements.mapControlsToggle.addEventListener("click", toggleMapPanel);
elements.closeMap.addEventListener("click", closeMapModal);
elements.selectMap.addEventListener("click", () => elements.mapInput.click());
elements.mapInput.addEventListener("change", (event) => {
  handleMapFile(event.target.files[0]);
  event.target.value = "";
});
elements.mapPageSelect.addEventListener("change", (event) => renderPdfPageToMap(event.target.value));
elements.mapEditToggle.addEventListener("click", toggleMapEdit);
elements.mapScaleTool.addEventListener("click", () => setMapToolMode("scale"));
elements.mapMeasureTool.addEventListener("click", () => setMapToolMode("measure"));
elements.mapRockMode.addEventListener("click", () => setMapPlotMode("rock"));
elements.mapSituationMode.addEventListener("click", () => setMapPlotMode("situation"));
elements.mapRecordSelect.addEventListener("change", (event) => selectMapRecord(event.target.value));
elements.mapPrevRecord.addEventListener("click", () => selectMapRecord(activeRecordIndex - 1));
elements.mapNextRecord.addEventListener("click", () => selectMapRecord(activeRecordIndex + 1));
elements.mapAddRecord.addEventListener("click", addRecordFromMap);
elements.mapSituationSelect.addEventListener("change", (event) => {
  activeSituationIndex = Number(event.target.value) || 0;
  renderMap();
});
elements.mapCanvas.addEventListener("pointerdown", startMapPointer);
elements.mapCanvas.addEventListener("pointermove", moveMapPointer);
elements.mapCanvas.addEventListener("pointerup", endMapPointer);
elements.mapCanvas.addEventListener("pointercancel", endMapPointer);
elements.mapPlacePoint.addEventListener("click", placeCurrentMapPointAtCrosshair);
elements.clearMapPoint.addEventListener("click", clearCurrentMapPoint);
elements.exportMap.addEventListener("click", exportMapImage);
elements.mapZoomOut.addEventListener("click", () => changeMapZoom(-0.25));
elements.mapZoomFit.addEventListener("click", fitMapZoom);
elements.mapZoomIn.addEventListener("click", () => changeMapZoom(0.25));
window.addEventListener("resize", () => renderMap());
elements.photoButton.addEventListener("click", () => togglePhotoMenu());
document.querySelectorAll("[data-photo-kind]").forEach((button) => {
  button.addEventListener("click", () => startRockPhoto(button.dataset.photoKind));
});
elements.situationPhoto.addEventListener("click", () => {
  const folder = window.prompt("状況写真の名前を入力してください（例: A、B、小石状況1、擁壁状況）", "状況写真1");
  if (!folder) return;
  pendingPhoto = { kind: "situation", folder: sanitizeName(folder) };
  elements.photoMenu.hidden = true;
  elements.cameraInput.click();
});
elements.cameraInput.addEventListener("change", (event) => {
  handlePhoto(event.target.files[0]);
  event.target.value = "";
});
elements.photoList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-photo-delete]");
  if (!button) return;
  const [group, indexText] = button.dataset.photoDelete.split(":");
  const index = Number(indexText);
  const photo = group === "rock" ? currentRecord().photos[index] : situationPhotos[index];
  const label = group === "rock" ? photoKindLabel(photo?.kind) : `状況: ${photo?.folder || ""}`;
  if (!window.confirm(`${label} ${photo?.name || ""} を削除しますか？\nこの操作は元に戻せません。`)) return;
  if (group === "rock") {
    currentRecord().photos.splice(index, 1);
    saveRecords();
  } else {
    situationPhotos.splice(index, 1);
    saveSituationPhotos();
  }
  render();
});
elements.toggleRockList.addEventListener("click", () => {
  photoListMode = photoListMode === "rock" ? "" : "rock";
  renderPhoto();
});
elements.toggleSituationList.addEventListener("click", () => {
  photoListMode = photoListMode === "situation" ? "" : "situation";
  renderPhoto();
});
elements.exportPhotos.addEventListener("click", exportPhotoZip);

render();

function startRockPhoto(kind) {
  pendingPhoto = { kind };
  closePhotoMenu();
  elements.cameraInput.click();
}

function togglePhotoMenu() {
  elements.photoMenu.hidden = !elements.photoMenu.hidden;
}

function closePhotoMenu() {
  elements.photoMenu.hidden = true;
}
