;(() => {
  if (window.__rockfallSafetyPatchV41) return;
  window.__rockfallSafetyPatchV41 = true;

  const backupReminderStepPatch = 10;
  let lastStorageWarningPatch = 0;

  function showStorageFullWarningPatch() {
    const now = Date.now();
    if (now - lastStorageWarningPatch < 10000) return;
    lastStorageWarningPatch = now;
    window.alert("【警告: 保存失敗】\nブラウザの保存容量を超過したため、変更を保存できませんでした。\nすぐにバックアップ（JSON）または写真ZIPを出力して、不要な写真や現場データを削除してください。");
  }

  function normalizeBackupStatePatch(state = {}) {
    return {
      jsonRecordCount: Number(state.jsonRecordCount) || 0,
      photoRecordCount: Number(state.photoRecordCount) || 0,
      dismissedRecordCount: Number(state.dismissedRecordCount) || 0,
      updatedAt: state.updatedAt || ""
    };
  }

  function currentBackupMilestonePatch() {
    const count = Array.isArray(records) ? records.length : 0;
    return count >= backupReminderStepPatch ? Math.floor(count / backupReminderStepPatch) * backupReminderStepPatch : 0;
  }

  function photoTotalCountPatch() {
    const rockTotal = (records || []).reduce((sum, record) => sum + (record.photos?.length || 0), 0);
    return rockTotal + ((situationPhotos || []).length);
  }

  function backupRequirementStatusPatch() {
    const milestone = currentBackupMilestonePatch();
    const state = normalizeBackupStatePatch(activeSite?.backup);
    return {
      milestone,
      jsonDone: milestone > 0 && state.jsonRecordCount >= milestone,
      photosDone: milestone > 0 && state.photoRecordCount >= milestone,
      dismissed: milestone > 0 && state.dismissedRecordCount >= milestone
    };
  }

  function ensureSafetyBackupPanelPatch() {
    if (!document.querySelector("#safety-backup-style")) {
      const style = document.createElement("style");
      style.id = "safety-backup-style";
      style.textContent = [
        ".safety-backup-panel{display:grid;gap:10px;margin:0 0 10px;padding:12px;border:1px solid #efc9b8;border-radius:8px;background:#fff6f1;}",
        ".safety-backup-panel[hidden]{display:none;}",
        ".safety-backup-panel .summary-title{color:var(--warn,#a94e17);}",
        ".safety-backup-panel p:last-child{margin:2px 0 0;color:var(--ink,#17211d);font-size:13px;font-weight:900;line-height:1.45;}",
        ".safety-backup-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}",
        ".safety-backup-actions button:disabled{opacity:.48;}"
      ].join("");
      document.head.append(style);
    }

    let panel = document.querySelector("#safety-backup-panel");
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "safety-backup-panel";
      panel.id = "safety-backup-panel";
      panel.hidden = true;
      panel.innerHTML = [
        "<div>",
        '<p class="summary-title">安全バックアップ</p>',
        '<p id="safety-backup-text">10件ごとのバックアップ推奨</p>',
        "</div>",
        '<div class="safety-backup-actions">',
        '<button class="small-button neutral-button" id="safety-backup-json" type="button">JSON</button>',
        '<button class="small-button neutral-button" id="safety-backup-photos" type="button">写真ZIP</button>',
        '<button class="small-button neutral-button" id="safety-backup-later" type="button">あとで</button>',
        "</div>"
      ].join("");
      document.querySelector(".site-panel")?.insertAdjacentElement("afterend", panel);
    }

    let rescue = document.querySelector(".site-actions a[href='recovery.html']");
    if (!rescue) {
      rescue = document.createElement("a");
      rescue.className = "small-button neutral-button";
      rescue.href = "recovery.html";
      rescue.textContent = "救出";
      document.querySelector(".site-actions")?.append(rescue);
    }

    if (panel.dataset.bound !== "1") {
      panel.dataset.bound = "1";
      document.querySelector("#safety-backup-json")?.addEventListener("click", exportBackupPatch);
      document.querySelector("#safety-backup-photos")?.addEventListener("click", exportPhotoZipPatch);
      document.querySelector("#safety-backup-later")?.addEventListener("click", dismissBackupReminderPatch);
    }
  }

  function renderSafetyBackupPatch() {
    ensureSafetyBackupPanelPatch();
    const panel = document.querySelector("#safety-backup-panel");
    const text = document.querySelector("#safety-backup-text");
    const jsonButton = document.querySelector("#safety-backup-json");
    const photosButton = document.querySelector("#safety-backup-photos");
    if (!panel || !text || !activeSite) {
      if (panel) panel.hidden = true;
      return;
    }
    activeSite.backup = normalizeBackupStatePatch(activeSite.backup);
    const status = backupRequirementStatusPatch();
    if (!status.milestone || (status.jsonDone && status.photosDone)) {
      panel.hidden = true;
      return;
    }
    const missing = [status.jsonDone ? "" : "JSON", status.photosDone ? "" : "写真ZIP"].filter(Boolean).join("・");
    panel.hidden = false;
    text.textContent = `落石${status.milestone}件到達。未出力: ${missing} / 写真 ${photoTotalCountPatch()}枚（状況写真含む）`;
    if (jsonButton) jsonButton.disabled = status.jsonDone;
    if (photosButton) photosButton.disabled = status.photosDone;
  }

  const originalSaveSitesIndexPatch = saveSitesIndex;
  saveSitesIndex = function patchedSaveSitesIndex(nextSites = sites) {
    try {
      originalSaveSitesIndexPatch(nextSites);
      return true;
    } catch {
      showStorageFullWarningPatch();
      return false;
    }
  };

  const originalSaveSiteDataPatch = saveSiteData;
  saveSiteData = function patchedSaveSiteData(site = activeSite) {
    const result = originalSaveSiteDataPatch(site);
    if (!result) showStorageFullWarningPatch();
    return result;
  };

  saveRecords = function patchedSaveRecords() {
    if (!activeSite) return false;
    activeSite.records = records;
    return saveSiteData(activeSite);
  };

  saveSituationPhotos = function patchedSaveSituationPhotos() {
    if (!activeSite) return false;
    activeSite.situationPhotos = situationPhotos;
    return saveSiteData(activeSite);
  };

  setCurrentValue = function patchedSetCurrentValue(value) {
    const field = currentField();
    const record = currentRecord();
    const beforeValues = { ...record.values };
    record.values[field.id] = value;
    if (field.id === "stoneType") {
      record.values.stability = "";
      record.values.commentA = "";
      record.values.commentB = "";
    }
    if (field.id === "workType" && value !== "3") {
      record.values.workRangeA = "";
      record.values.workRangeB = "";
    }
    if (!saveRecords()) record.values = beforeValues;
    render();
  };

  function maybeShowBackupReminderPatch() {
    if ((records || []).length % backupReminderStepPatch !== 0) return;
    const status = backupRequirementStatusPatch();
    if (!status.milestone || (status.jsonDone && status.photosDone) || status.dismissed) return;
    window.alert(`落石${status.milestone}件に到達しました。\n安全のため「JSON」と「写真ZIP」を出力してください。\n写真ZIPには状況写真も含まれます。`);
  }

  function addRecordPatch() {
    normalizeFieldBeforeMove();
    const nextNo = records.length ? Math.max(...records.map((record) => record.no)) + 1 : 1;
    const previousIndex = activeRecordIndex;
    const previousFieldIndex = activeFieldIndex;
    records.push(createRecord(nextNo));
    activeRecordIndex = records.length - 1;
    activeFieldIndex = 0;
    if (!saveRecords()) {
      records.pop();
      activeRecordIndex = previousIndex;
      activeFieldIndex = previousFieldIndex;
      render();
      return;
    }
    render();
    maybeShowBackupReminderPatch();
  }

  addRecord = addRecordPatch;
  document.querySelector("#new-record")?.addEventListener("click", (event) => {
    event.stopImmediatePropagation();
    addRecordPatch();
  }, true);

  function markBackupDonePatch(kind) {
    if (!activeSite) return;
    const milestone = currentBackupMilestonePatch();
    if (!milestone) return;
    const previousBackup = normalizeBackupStatePatch(activeSite.backup);
    activeSite.backup = normalizeBackupStatePatch(activeSite.backup);
    if (kind === "json") activeSite.backup.jsonRecordCount = Math.max(activeSite.backup.jsonRecordCount, milestone);
    if (kind === "photos") activeSite.backup.photoRecordCount = Math.max(activeSite.backup.photoRecordCount, milestone);
    activeSite.backup.updatedAt = new Date().toISOString();
    if (!saveSiteData(activeSite)) activeSite.backup = previousBackup;
    renderSafetyBackupPatch();
  }

  function dismissBackupReminderPatch() {
    if (!activeSite) return;
    const milestone = currentBackupMilestonePatch();
    if (!milestone) return;
    const previousBackup = normalizeBackupStatePatch(activeSite.backup);
    activeSite.backup = normalizeBackupStatePatch(activeSite.backup);
    activeSite.backup.dismissedRecordCount = Math.max(activeSite.backup.dismissedRecordCount, milestone);
    activeSite.backup.updatedAt = new Date().toISOString();
    if (!saveSiteData(activeSite)) activeSite.backup = previousBackup;
    renderSafetyBackupPatch();
  }

  const originalExportBackupPatch = exportBackup;
  function exportBackupPatch() {
    originalExportBackupPatch();
    markBackupDonePatch("json");
  }
  exportBackup = exportBackupPatch;

  const originalExportPhotoZipPatch = exportPhotoZip;
  function exportPhotoZipPatch() {
    originalExportPhotoZipPatch();
    markBackupDonePatch("photos");
  }
  exportPhotoZip = exportPhotoZipPatch;

  document.querySelector("#backup-site")?.addEventListener("click", (event) => {
    event.stopImmediatePropagation();
    exportBackupPatch();
  }, true);
  document.querySelector("#export-photos")?.addEventListener("click", (event) => {
    event.stopImmediatePropagation();
    exportPhotoZipPatch();
  }, true);

  const originalRenderPatch = render;
  render = function patchedRender(...args) {
    const result = originalRenderPatch.apply(this, args);
    renderSafetyBackupPatch();
    return result;
  };

  ensureSafetyBackupPanelPatch();
  renderSafetyBackupPatch();
})();
