(function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const colorInput = document.getElementById("color");
  const sizeInput = document.getElementById("size");
  const sizeValue = document.getElementById("sizeValue");
  const btnClear = document.getElementById("btnClear");
  const btnSave = document.getElementById("btnSave");
  const saveNameInput = document.getElementById("saveName");
  const saveFormatSelect = document.getElementById("saveFormat");
  const modeButtons = document.querySelectorAll(".btn-mode");

  const CSS_W = 900;
  const CSS_H = 600;

  let mode = "pen";
  let drawing = false;
  let lastX = 0;
  let lastY = 0;

  function getDpr() {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  function resizeCanvas() {
    const dpr = getDpr();
    const wrap = canvas.parentElement;
    const maxW = Math.min(CSS_W, wrap.clientWidth - 8);
    const ratio = CSS_H / CSS_W;
    const cssW = maxW;
    const cssH = maxW * ratio;

    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";

    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssW, cssH);
  }

  function getPoint(e) {
    const dpr = getDpr();
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    const x = ((clientX - rect.left) / rect.width) * cssW;
    const y = ((clientY - rect.top) / rect.height) * cssH;
    return { x, y };
  }

  function lineTo(x, y) {
    const lineWidth = parseInt(sizeInput.value, 10);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "source-over";
    if (mode === "eraser") {
      ctx.strokeStyle = "#ffffff";
    } else {
      ctx.strokeStyle = colorInput.value;
    }
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
  }

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    const p = getPoint(e);
    lastX = p.x;
    lastY = p.y;
  }

  function moveDraw(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = getPoint(e);
    lineTo(p.x, p.y);
  }

  function endDraw(e) {
    if (e) e.preventDefault();
    drawing = false;
  }

  sizeInput.addEventListener("input", () => {
    sizeValue.textContent = sizeInput.value;
  });

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      modeButtons.forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  btnClear.addEventListener("click", () => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  });

  function sanitizeBaseName(name) {
    let s = String(name).trim();
    s = s.replace(/\.(png|jpe?g|gif)$/i, "");
    s = s.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
    s = s.replace(/^\.+$/, "");
    if (!s) s = "drawing";
    return s.slice(0, 200);
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  btnSave.addEventListener("click", async () => {
    const base = sanitizeBaseName(saveNameInput.value);
    const fmt = saveFormatSelect.value;
    const ext = fmt === "jpg" ? "jpg" : fmt;
    const filename = `${base}.${ext}`;

    try {
      if (fmt === "png") {
        canvas.toBlob((blob) => {
          if (blob) triggerDownload(blob, filename);
        }, "image/png");
      } else if (fmt === "jpg") {
        canvas.toBlob((blob) => {
          if (blob) triggerDownload(blob, filename);
        }, "image/jpeg", 0.92);
      } else if (fmt === "gif") {
        const { GIFEncoder, quantize, applyPalette } = await import("./gifenc.esm.js");
        const w = canvas.width;
        const h = canvas.height;
        const imageData = ctx.getImageData(0, 0, w, h);
        const palette = quantize(imageData.data, 256);
        const index = applyPalette(imageData.data, palette);
        const gif = GIFEncoder();
        gif.writeFrame(index, w, h, { palette });
        gif.finish();
        const blob = new Blob([gif.bytes()], { type: "image/gif" });
        triggerDownload(blob, filename);
      }
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました。");
    }
  });

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", moveDraw);
  canvas.addEventListener("mouseup", endDraw);
  canvas.addEventListener("mouseleave", endDraw);

  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", moveDraw, { passive: false });
  canvas.addEventListener("touchend", endDraw);
  canvas.addEventListener("touchcancel", endDraw);

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 150);
  });

  resizeCanvas();
})();
