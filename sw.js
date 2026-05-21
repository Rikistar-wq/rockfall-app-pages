const cacheName = "rockfall-log-v33";
const assets = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg"
];

const mapLabelPatch = `
;(() => {
  function layoutMapLabels(points, width, height, options = {}) {
    const placed = [];
    const isExport = options.mode === "export";
    const fontSize = isExport ? Math.max(28, Math.min(44, Math.round(Math.min(width, height) * 0.018))) : 12;
    const gap = isExport ? fontSize * 0.8 : 8;
    const offsets = [
      { x: 0, y: 0 },
      { x: gap, y: -gap },
      { x: gap, y: gap },
      { x: -gap, y: -gap },
      { x: -gap, y: gap },
      { x: gap * 1.8, y: 0 },
      { x: -gap * 1.8, y: 0 },
      { x: 0, y: -gap * 1.8 },
      { x: 0, y: gap * 1.8 }
    ];

    return points.map((point) => {
      const pointFontSize = fontSize + (point.active ? 2 : 0);
      const boxWidth = Math.max(pointFontSize + 8, point.label.length * pointFontSize * 0.7 + 8);
      const boxHeight = pointFontSize + 8;
      let best = null;

      offsets.forEach((offset, offsetIndex) => {
        const x = Math.max(boxWidth / 2, Math.min(width - boxWidth / 2, point.x + offset.x));
        const y = Math.max(boxHeight / 2, Math.min(height - boxHeight / 2, point.y + offset.y));
        const box = {
          left: x - boxWidth / 2,
          right: x + boxWidth / 2,
          top: y - boxHeight / 2,
          bottom: y + boxHeight / 2
        };
        const overlap = placed.reduce((sum, other) => sum + overlapArea(box, other.box), 0);
        const distance = Math.hypot(x - point.x, y - point.y);
        const score = overlap * 100 + distance + offsetIndex * 0.1;
        if (!best || score < best.score) best = { x, y, box, score };
      });

      const result = {
        ...point,
        labelX: best.x,
        labelY: best.y,
        fontSize: pointFontSize,
        haloSize: isExport ? pointFontSize + 11 : pointFontSize + 4
      };
      placed.push({ box: best.box });
      return result;
    });
  }

  function overlapArea(a, b) {
    const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return width * height;
  }

  drawMapPoints = function patchedDrawMapPoints(context, width, height, options = {}) {
    const labels = [];
    records.forEach((record, index) => {
      if (!record.mapPoint) return;
      labels.push({
        x: record.mapPoint.x * width,
        y: record.mapPoint.y * height,
        label: String(record.no),
        active: mapPlotMode === "rock" && index === activeRecordIndex,
        color: "#0d6b55"
      });
    });
    situationPhotos.forEach((photo, index) => {
      if (!photo.mapPoint) return;
      labels.push({
        x: photo.mapPoint.x * width,
        y: photo.mapPoint.y * height,
        label: "状" + (index + 1),
        active: mapPlotMode === "situation" && index === activeSituationIndex,
        color: "#315f9c"
      });
    });
    layoutMapLabels(labels, width, height, options).forEach((point) => drawMapLabel(context, point, options));
  };

  drawMapLabel = function patchedDrawMapLabel(context, point, options = {}) {
    const fontSize = point.fontSize || (point.active ? 14 : 12);
    const haloSize = point.haloSize || (point.active ? 18 : 16);
    const labelX = point.labelX ?? point.x;
    const labelY = point.labelY ?? point.y;
    const moved = Math.hypot(labelX - point.x, labelY - point.y) > 1;
    context.save();

    if (moved) {
      context.strokeStyle = "rgba(23, 33, 29, 0.34)";
      context.lineWidth = options.mode === "export" ? 1.6 : 1.1;
      context.beginPath();
      context.moveTo(point.x, point.y);
      context.lineTo(labelX, labelY);
      context.stroke();
    }

    context.fillStyle = point.active ? point.color + "cc" : point.color + "aa";
    context.beginPath();
    context.arc(point.x, point.y, options.mode === "export" ? Math.max(4, fontSize * 0.18) : 2.4, 0, Math.PI * 2);
    context.fill();

    context.font = "900 " + fontSize + "px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = point.active ? "rgba(255, 255, 255, 0.62)" : "rgba(255, 255, 255, 0.38)";
    context.beginPath();
    context.arc(labelX, labelY, haloSize / 2, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = options.mode === "export" ? 3.2 : point.active ? 2.3 : 1.8;
    context.strokeStyle = point.active ? "rgba(255, 255, 255, 0.88)" : "rgba(255, 255, 255, 0.7)";
    context.strokeText(point.label, labelX, labelY + 0.5);
    context.fillStyle = point.active ? point.color : point.color + "cc";
    context.fillText(point.label, labelX, labelY + 0.5);
    context.restore();
  };

  const originalExportMapImage = exportMapImage;
  exportMapImage = async function patchedExportMapImage() {
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
    drawMapPoints(context, canvas.width, canvas.height, { mode: "export" });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileSafeName(activeSite?.name || "未設定現場") + "_落石位置図.png";
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  if (elements?.exportMap) {
    elements.exportMap.removeEventListener("click", originalExportMapImage);
    elements.exportMap.addEventListener("click", exportMapImage);
  }
  if (!elements?.mapModal?.hidden) renderMap();
})();
`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
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
        .then((source) => new Response(source + "\n" + mapLabelPatch, {
          headers: { "Content-Type": "application/javascript; charset=utf-8" }
        }))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
