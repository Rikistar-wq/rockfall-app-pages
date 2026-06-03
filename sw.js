const cacheName = "rockfall-log-v38";
const assets = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg"
];

const appPatch = `
;(() => {
  if (window.__photoManagementPatchAppliedV38) return;
  window.__photoManagementPatchAppliedV38 = true;

  const requiredRockPhotoKindsPatch = ["full", "shape", "depth"];
  const photoStandardProfilePatch = {
    name: "JPEG 1600px",
    maxLongSide: 1600,
    jpegQuality: 0.82,
    targetNote: "JPEG / 長辺1600px / 100〜300万画素目安"
  };
  const photoSaveProfilesPatch = [
    photoStandardProfilePatch,
    { name: "JPEG 1280px", maxLongSide: 1280, jpegQuality: 0.78 },
    { name: "JPEG 1024px", maxLongSide: 1024, jpegQuality: 0.72 },
    { name: "JPEG 800px", maxLongSide: 800, jpegQuality: 0.66 }
  ];

  function ensurePhotoUiPatch() {
    if (!elements?.photoPanel) return;
    let grid = document.querySelector("#photo-status-grid");
    if (!grid) {
      grid = document.createElement("div");
      grid.id = "photo-status-grid";
      grid.className = "photo-status-grid";
      const head = elements.photoPanel.querySelector(".photo-head");
      head?.insertAdjacentElement("afterend", grid);
    }
    let note = document.querySelector("#photo-folder-note");
    if (!note) {
      note = document.createElement("p");
      note.id = "photo-folder-note";
      note.className = "photo-folder-note";
      grid.insertAdjacentElement("afterend", note);
    }
    elements.photoStatusGrid = grid;
    elements.photoFolderNote = note;
    if (grid.dataset.bound !== "1") {
      grid.dataset.bound = "1";
      grid.addEventListener("click", (event) => {
        const button = event.target.closest("[data-photo-status-kind]");
        if (!button) return;
        startRockPhoto(button.dataset.photoStatusKind);
      });
    }
  }

  function injectStylePatch() {
    if (document.querySelector("#management-patch-style")) return;
    const style = document.createElement("style");
    style.id = "management-patch-style";
    style.textContent =
      ".photo-status-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:8px 0;}" +
      ".photo-status{display:grid;gap:2px;min-height:48px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:#f7faf8;text-align:center;}" +
      ".photo-status span{color:var(--muted);font-size:12px;font-weight:900;}" +
      ".photo-status strong{color:var(--warn);font-size:14px;font-weight:900;}" +
      ".photo-status.done{border-color:#a9d2c4;background:#e8f6f1;}" +
      ".photo-status.done strong{color:var(--accent-strong);}" +
      ".photo-folder-note{margin:2px 0 8px;color:var(--muted);font-size:11px;font-weight:800;overflow-wrap:anywhere;}" +
      ".photo-item .photo-path{color:var(--accent-strong);font-size:11px;}" +
      ".site-danger-zone{display:grid;gap:8px;margin:14px 0 10px;padding-top:12px;border-top:1px solid #efc9b8;}" +
      ".site-danger-zone[hidden]{display:none;}" +
      ".site-danger-zone p{margin:0;color:var(--warn);font-size:12px;font-weight:900;}" +
      ".danger-button{color:#8c2f12;border-color:#efc9b8;background:#fff1ea;}";
    document.head.append(style);
  }

  function photoZipRootNamePatch() {
    return fileSafeName(activeSite?.name || "未設定現場");
  }

  function photoOutputNamePatch(photo) {
    if (photo.kind === "situation") return photo.name;
    return photoKindLabel(photo.kind) + "_" + photo.name;
  }

  function photoOutputPathPatch(photo, group, index, record = currentRecord()) {
    const root = photoZipRootNamePatch();
    if (group === "situation") {
      return root + "/状況写真/" + sanitizeName(photo.folder || ("状況写真" + (index + 1))) + "/" + photoOutputNamePatch(photo);
    }
    return root + "/落石/No." + record.no + "/" + photoOutputNamePatch(photo);
  }

  function createStandardPhotoPatch(image, profile = photoStandardProfilePatch) {
    const maxSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, profile.maxLongSide / maxSide);
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);
    return {
      dataUrl: canvas.toDataURL("image/jpeg", profile.jpegQuality),
      width,
      height
    };
  }

  function savePhotoTargetPatch(isSituation) {
    if (!activeSite) return false;
    if (isSituation) activeSite.situationPhotos = situationPhotos;
    else activeSite.records = records;
    return saveSiteData(activeSite);
  }

  renderPhoto = function patchedRenderPhoto() {
    ensurePhotoUiPatch();
    const recordPhotos = currentRecord().photos || [];
    const rockTotal = records.reduce((sum, record) => sum + (record.photos?.length || 0), 0);
    const total = rockTotal + situationPhotos.length;
    const missing = requiredRockPhotoKindsPatch.filter((kind) => !recordPhotos.some((photo) => photo.kind === kind));
    elements.photoMeta.textContent = "このNo: " + recordPhotos.length + "枚 / 未撮影: " + (missing.length ? missing.map(photoKindLabel).join("・") : "なし") + " / 状況: " + situationPhotos.length + "枚 / 全体: " + total + "枚";
    elements.photoStatusGrid.innerHTML = requiredRockPhotoKindsPatch.map((kind) => {
      const photos = recordPhotos.filter((photo) => photo.kind === kind);
      const done = photos.length > 0;
      return '<button class="photo-status ' + (done ? 'done' : 'missing') + '" type="button" data-photo-status-kind="' + kind + '"><span>' + photoKindLabel(kind) + '</span><strong>' + (done ? '撮影済 ' + photos.length : '未撮影') + '</strong></button>';
    }).join("");
    elements.photoFolderNote.textContent = "写真ZIP: " + photoZipRootNamePatch() + "/落石/No." + currentRecord().no + "/... / 保存: " + photoStandardProfilePatch.targetNote;
    elements.toggleRockList.textContent = photoListMode === "rock" ? "落石閉じる" : "落石一覧";
    elements.toggleSituationList.textContent = photoListMode === "situation" ? "状況閉じる" : "状況一覧";
    elements.photoList.hidden = !photoListMode;
    if (photoListMode === "rock") {
      elements.photoList.innerHTML = recordPhotos.map((photo, index) => photoListItem(photo, index, "rock")).join("") || '<p class="empty-photo">このNoの写真は未撮影</p>';
      return;
    }
    if (photoListMode === "situation") {
      elements.photoList.innerHTML = situationPhotos.map((photo, index) => photoListItem(photo, index, "situation")).join("") || '<p class="empty-photo">状況写真は未撮影</p>';
      return;
    }
    elements.photoList.innerHTML = "";
  };

  photoListItem = function patchedPhotoListItem(photo, index, group) {
    const size = photo.compressedSize ? " / " + formatBytes(photo.compressedSize) : "";
    const dimensions = photo.width && photo.height ? " / " + photo.width + "x" + photo.height : "";
    const label = group === "rock" ? photoKindLabel(photo.kind) : "状況: " + photo.folder;
    const outputPath = photoOutputPathPatch(photo, group, index);
    return '<article class="photo-item"><img src="' + photo.dataUrl + '" alt="' + escapeHtml(label) + '"><div><strong>' + escapeHtml(label) + '</strong><span>' + escapeHtml(photo.name + size + dimensions) + '</span><span class="photo-path">ZIP: ' + escapeHtml(outputPath) + '</span><button class="photo-delete" type="button" data-photo-delete="' + group + ':' + index + '">削除...</button></div></article>';
  };

  handlePhoto = async function patchedHandlePhoto(file) {
    if (!file) return;
    const photoRequest = pendingPhoto || { kind: "full" };
    try {
      const sourceUrl = await readFileAsDataUrl(file);
      const image = await loadImage(sourceUrl);
      const takenAt = new Date().toISOString();
      const isSituation = photoRequest.kind === "situation";
      let savedProfile = "";
      for (const profile of photoSaveProfilesPatch) {
        const standardPhoto = createStandardPhotoPatch(image, profile);
        const photo = {
          kind: photoRequest.kind || "full",
          name: photoFileName(photoRequest, takenAt),
          dataUrl: standardPhoto.dataUrl,
          takenAt,
          originalSize: file.size,
          compressedSize: estimateDataUrlBytes(standardPhoto.dataUrl),
          width: standardPhoto.width,
          height: standardPhoto.height,
          format: "image/jpeg",
          standardProfile: profile.name
        };
        if (isSituation) situationPhotos.push({ ...photo, folder: photoRequest.folder });
        else currentRecord().photos.push(photo);
        if (savePhotoTargetPatch(isSituation)) {
          savedProfile = profile.name;
          break;
        }
        if (isSituation) situationPhotos.pop();
        else currentRecord().photos.pop();
      }
      if (!savedProfile) {
        window.alert("写真を保存できませんでした。端末内の保存容量が不足しています。先に写真ZIPまたはバックアップを出して、不要な写真や現場を削除してください。");
      } else if (savedProfile !== photoStandardProfilePatch.name) {
        window.alert("保存容量を確保するため、この写真は " + savedProfile + " に自動縮小して保存しました。");
      }
    } catch {
      window.alert("写真を読み込めませんでした。もう一度撮影してください。");
    } finally {
      pendingPhoto = null;
      render();
    }
  };

  makeZip = function patchedMakeZip(entries) {
    const files = [];
    const central = [];
    let offset = 0;
    for (const entry of entries) {
      const name = utf8Bytes(entry.path);
      const crc = crc32(entry.bytes);
      const local = concatBytes(
        u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
        u32(crc), u32(entry.bytes.length), u32(entry.bytes.length),
        u16(name.length), u16(0), name, entry.bytes
      );
      files.push(local);
      central.push(concatBytes(
        u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
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
  };

  exportPhotoZip = function patchedExportPhotoZip() {
    const entries = [];
    for (const record of records) {
      for (const photo of record.photos || []) {
        entries.push({ path: photoOutputPathPatch(photo, "rock", 0, record), bytes: dataUrlToBytes(photo.dataUrl) });
      }
    }
    situationPhotos.forEach((photo, index) => {
      entries.push({ path: photoOutputPathPatch(photo, "situation", index), bytes: dataUrlToBytes(photo.dataUrl) });
    });
    if (!entries.length) {
      window.alert("出力する写真がありません。");
      return;
    }
    try {
      const blob = makeZip(entries);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileSafeName(activeSite?.name || "未設定現場") + "_落石写真.zip";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("写真ZIPを作成できませんでした。写真枚数が多い場合は、現場を分けるか不要な写真を削除してから再度出力してください。");
    }
  };

  if (elements?.exportPhotos && elements.exportPhotos.dataset.patchV38 !== "1") {
    elements.exportPhotos.dataset.patchV38 = "1";
    elements.exportPhotos.addEventListener("click", (event) => {
      event.stopImmediatePropagation();
      exportPhotoZip();
    }, true);
  }

  function ensureSiteDangerUiPatch() {
    if (!elements?.siteModal) return;
    let zone = document.querySelector("#site-danger-zone");
    if (!zone) {
      zone = document.createElement("div");
      zone.id = "site-danger-zone";
      zone.className = "site-danger-zone";
      zone.innerHTML = '<p>現在の現場</p><button class="small-button neutral-button full-button" id="clear-current-site" type="button">現場情報をクリア</button><button class="small-button danger-button full-button" id="delete-current-site" type="button">現場を削除</button>';
      elements.siteList?.insertAdjacentElement("afterend", zone);
    }
    elements.siteDangerZone = zone;
    elements.clearCurrentSite = document.querySelector("#clear-current-site");
    elements.deleteCurrentSite = document.querySelector("#delete-current-site");
    if (zone.dataset.bound !== "1") {
      zone.dataset.bound = "1";
      elements.clearCurrentSite?.addEventListener("click", clearCurrentSiteDataPatch);
      elements.deleteCurrentSite?.addEventListener("click", deleteCurrentSitePatch);
    }
  }

  function confirmDangerousSiteActionPatch(actionLabel) {
    if (!activeSite) return false;
    const message = [
      activeSite.name + " の" + actionLabel + "を実行します。",
      "この操作は元に戻せません。",
      "実行前に必要ならバックアップを出してください。",
      "",
      "続けるには現場名を正確に入力してください。"
    ].join("\\n");
    const typed = window.prompt(message, "");
    if (typed === null) return false;
    if (typed.trim() !== activeSite.name) {
      window.alert("現場名が一致しないため中止しました。");
      return false;
    }
    return window.confirm("本当に " + activeSite.name + " の" + actionLabel + "を実行しますか？");
  }

  function clearCurrentSiteDataPatch() {
    if (!activeSite || !confirmDangerousSiteActionPatch("情報クリア")) return;
    activeSite.records = [createRecord(1)];
    activeSite.situationPhotos = [];
    activeSite.map = null;
    records = activeSite.records;
    situationPhotos = activeSite.situationPhotos;
    activeRecordIndex = 0;
    activeFieldIndex = 0;
    pendingPhoto = null;
    photoListMode = "";
    mapPlotMode = "rock";
    mapToolMode = "view";
    activeSituationIndex = 0;
    saveSiteData(activeSite);
    window.alert("現場情報をクリアしました。");
    closeSiteModal();
    render();
  }

  function deleteCurrentSitePatch() {
    if (!activeSite || !confirmDangerousSiteActionPatch("削除")) return;
    const deletedSiteId = activeSite.id;
    sites = sites.filter((site) => site.id !== deletedSiteId);
    localStorage.removeItem(siteDataKey(deletedSiteId));
    saveSitesIndex();
    const nextSite = sites[0] || null;
    if (nextSite) {
      bindActiveSite(nextSite.id);
    } else {
      activeSiteId = "";
      activeSite = null;
      records = [];
      situationPhotos = [];
      localStorage.removeItem(activeSiteKey);
    }
    window.alert("現場を削除しました。");
    if (!activeSite) {
      elements.siteModal.hidden = false;
      openSiteModal(true);
    } else {
      closeSiteModal();
    }
    render();
  }

  const originalRenderSitePatch = renderSite;
  renderSite = function patchedRenderSite(...args) {
    const result = originalRenderSitePatch.apply(this, args);
    ensureSiteDangerUiPatch();
    if (elements.siteDangerZone) elements.siteDangerZone.hidden = !activeSite;
    if (elements.clearCurrentSite) elements.clearCurrentSite.disabled = !activeSite;
    if (elements.deleteCurrentSite) elements.deleteCurrentSite.disabled = !activeSite;
    return result;
  };

  injectStylePatch();
  ensurePhotoUiPatch();
  ensureSiteDangerUiPatch();
  renderSite();
  renderPhoto();
})();
`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.endsWith("/app.js")) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
        .then((response) => response.text())
        .then((source) => new Response(source + "\n" + appPatch, {
          headers: { "Content-Type": "application/javascript; charset=utf-8" }
        }))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
