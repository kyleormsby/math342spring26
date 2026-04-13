/*
 * HEP Retraction Interactive – D² × [0,1] → D² × {0} ∪ S¹ × [0,1]
 *
 * This script is loaded by PreTeXt via <interactive platform="javascript">.
 * It renders into the <slate> div whose id is passed by PreTeXt.
 *
 * Requires Three.js r128 (loaded via <script> in the interactive).
 */

(function () {
  "use strict";

  // PreTeXt creates a div from the <slate> element.
  // The id of that div matches the xml:id of the slate.
  var container = document.getElementById("slate-hep-retraction");
  if (!container) return;

  /* ── geometry ── */

  function retract3d(x, y, t) {
    var r = Math.sqrt(x * x + y * y);
    if (r < 1e-10) return [0, 0, 0];
    var threshold = 1 - t / 2;
    if (r <= threshold) {
      var scale = 2 / (2 - t);
      return [x * scale, y * scale, 0];
    }
    var newT = 2 - (2 - t) / r;
    return [x / r, y / r, newT];
  }

  function homotopyPt(x, y, t, s) {
    var ref = retract3d(x, y, t);
    return [
      x + s * (ref[0] - x),
      y + s * (ref[1] - y),
      t + s * (ref[2] - t)
    ];
  }

  /* ── constants ── */

  var N_RINGS = 32, N_SEGS = 64, N_RIBS = 32, RIB_SEGMENTS = 40;
  var TARGET_COLOR = 0xef4444;

  /* ── build controls ── */

  container.style.fontFamily = "'STIX Two Text', Georgia, serif";
  container.style.maxWidth = "540px";
  container.style.margin = "0 auto";

  var viewerDiv = document.createElement("div");
  viewerDiv.style.cssText =
    "border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;" +
    "background:#fafaf8;cursor:grab;width:100%;aspect-ratio:520/440;position:relative;";
  container.appendChild(viewerDiv);

  var canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:100%;height:100%;";
  viewerDiv.appendChild(canvas);

  var ctrlDiv = document.createElement("div");
  ctrlDiv.style.cssText = "display:flex;align-items:center;gap:12px;margin-top:10px;justify-content:center;";
  var sLabel = document.createElement("label");
  sLabel.style.cssText = "font-size:14px;color:#555;min-width:52px;";
  sLabel.innerHTML = "<i>s</i> = 0.00";
  ctrlDiv.appendChild(sLabel);
  var slider = document.createElement("input");
  slider.type = "range"; slider.min = "0"; slider.max = "1"; slider.step = "0.005"; slider.value = "0";
  slider.style.cssText = "flex:1;max-width:260px;accent-color:#2563eb;";
  ctrlDiv.appendChild(slider);
  container.appendChild(ctrlDiv);

  var btnDiv = document.createElement("div");
  btnDiv.style.cssText = "display:flex;gap:8px;justify-content:center;margin-top:8px;";
  var btnAnimate = document.createElement("button");
  btnAnimate.textContent = "Animate";
  btnAnimate.style.cssText = "padding:5px 16px;font-size:13px;border:1px solid #cbd5e1;border-radius:4px;background:#eff6ff;color:#1d4ed8;cursor:pointer;font-family:inherit;";
  btnDiv.appendChild(btnAnimate);
  var btnReset = document.createElement("button");
  btnReset.textContent = "Reset";
  btnReset.style.cssText = "padding:5px 16px;font-size:13px;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;color:#475569;cursor:pointer;font-family:inherit;";
  btnDiv.appendChild(btnReset);
  container.appendChild(btnDiv);

  var captionP = document.createElement("p");
  captionP.style.cssText = "margin-top:12px;font-size:13px;color:#666;line-height:1.55;text-align:center;";
  captionP.textContent = "Drag to rotate \u00b7 scroll to zoom. The bottom disk and lateral wall are the fixed target. The top disk deforms as s increases, collapsing onto the target at s\u00a0=\u00a01.";
  container.appendChild(captionP);

  /* ── Three.js scene ── */

  var W = viewerDiv.clientWidth || 520;
  var H = viewerDiv.clientHeight || 440;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xfafaf8, 1);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 50);
  camera.position.set(3.2, 2.4, 3.0);
  camera.lookAt(0, 0.45, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  var dirLight = new THREE.DirectionalLight(0xffffff, 0.45);
  dirLight.position.set(3, 5, 4);
  scene.add(dirLight);

  function render() { renderer.render(scene, camera); }

  /* ── resize ── */

  window.addEventListener("resize", function () {
    W = viewerDiv.clientWidth; H = viewerDiv.clientHeight;
    if (W > 0 && H > 0) {
      renderer.setSize(W, H);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      render();
    }
  });

  /* ── target (static) ── */

  (function buildTarget() {
    var g = new THREE.Group();
    var rimCurve = new THREE.EllipseCurve(0, 0, 1, 1, 0, 2 * Math.PI, false, 0);
    var rimPts = rimCurve.getPoints(96).map(function (p) { return new THREE.Vector3(p.x, 0, p.y); });
    g.add(new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(rimPts),
      new THREE.LineBasicMaterial({ color: TARGET_COLOR })
    ));
    var diskGeo = new THREE.CircleGeometry(1, 64);
    var disk = new THREE.Mesh(diskGeo, new THREE.MeshPhongMaterial({
      color: TARGET_COLOR, transparent: true, opacity: 0.25, side: THREE.DoubleSide, shininess: 20
    }));
    disk.rotation.x = -Math.PI / 2;
    g.add(disk);

    var cylGeo = new THREE.CylinderGeometry(1, 1, 1, 64, 1, true);
    var cyl = new THREE.Mesh(cylGeo, new THREE.MeshPhongMaterial({
      color: TARGET_COLOR, transparent: true, opacity: 0.12,
      side: THREE.DoubleSide, shininess: 20, depthWrite: false
    }));
    cyl.position.y = 0.5;
    g.add(cyl);

    for (var i = 0; i < 24; i++) {
      var a = (i / 24) * Math.PI * 2;
      var x = Math.cos(a), z = Math.sin(a);
      g.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 1, z)
        ]),
        new THREE.LineBasicMaterial({ color: TARGET_COLOR, transparent: true, opacity: 0.25 })
      ));
    }

    [0, 1].forEach(function (h) {
      var pts = rimCurve.getPoints(96).map(function (p) { return new THREE.Vector3(p.x, h, p.y); });
      g.add(new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: TARGET_COLOR, transparent: true, opacity: h === 0 ? 0.8 : 0.35 })
      ));
    });

    var pMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x1d4ed8 })
    );
    pMesh.position.set(0, 2, 0);
    g.add(pMesh);

    var c2 = document.createElement("canvas");
    c2.width = 256; c2.height = 64;
    var ctx = c2.getContext("2d");
    ctx.font = "italic 28px Georgia, serif";
    ctx.fillStyle = "#1d4ed8";
    ctx.fillText("p = (0, 2)", 4, 40);
    var tex = new THREE.CanvasTexture(c2);
    tex.minFilter = THREE.LinearFilter;
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(0.8, 0.2, 1);
    sprite.position.set(0.12, 2.08, 0);
    g.add(sprite);

    scene.add(g);
  })();

  /* ── deforming top disk ── */

  var diskVertexCoords = (function () {
    var coords = [[0, 0]];
    for (var ri = 1; ri <= N_RINGS; ri++) {
      var r = ri / N_RINGS;
      for (var si = 0; si < N_SEGS; si++) {
        var a = (si / N_SEGS) * Math.PI * 2;
        coords.push([r * Math.cos(a), r * Math.sin(a)]);
      }
    }
    return coords;
  })();

  function makeDiskGeometry() {
    var positions = [0, 0, 0];
    var indices = [];
    for (var ri = 1; ri <= N_RINGS; ri++) {
      var r = ri / N_RINGS;
      for (var si = 0; si < N_SEGS; si++) {
        var a = (si / N_SEGS) * Math.PI * 2;
        positions.push(r * Math.cos(a), 0, r * Math.sin(a));
      }
    }
    for (var si = 0; si < N_SEGS; si++) {
      indices.push(0, 1 + si, 1 + (si + 1) % N_SEGS);
    }
    for (var ri = 1; ri < N_RINGS; ri++) {
      var off0 = 1 + (ri - 1) * N_SEGS, off1 = 1 + ri * N_SEGS;
      for (var si = 0; si < N_SEGS; si++) {
        var next = (si + 1) % N_SEGS;
        indices.push(off0 + si, off1 + si, off1 + next);
        indices.push(off0 + si, off1 + next, off0 + next);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  var topDiskGeo = makeDiskGeometry();
  var topDisk = new THREE.Mesh(topDiskGeo, new THREE.MeshPhongMaterial({
    color: 0xef4444, transparent: true, opacity: 0.35,
    side: THREE.DoubleSide, shininess: 20, depthWrite: false
  }));
  scene.add(topDisk);

  var ringPts = [];
  for (var si = 0; si <= N_SEGS; si++) {
    var a = (si / N_SEGS) * Math.PI * 2;
    ringPts.push(new THREE.Vector3(Math.cos(a), 1, Math.sin(a)));
  }
  var ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
  scene.add(new THREE.Line(ringGeo, new THREE.LineBasicMaterial({
    color: 0xb91c1c, transparent: true, opacity: 0.8
  })));

  /* ── vertical ribs ── */

  var ribs = [];
  for (var i = 0; i < N_RIBS; i++) {
    var a = (i / N_RIBS) * Math.PI * 2;
    var x = Math.cos(a), y = Math.sin(a);
    var pts = [];
    for (var j = 0; j <= RIB_SEGMENTS; j++) {
      pts.push(new THREE.Vector3(x, j / RIB_SEGMENTS, y));
    }
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0xdc2626, transparent: true, opacity: 0.4
    }));
    scene.add(line);
    ribs.push({ x: x, y: y, geo: geo });
  }

  /* ── update functions ── */

  function updateTopDisk(s) {
    var posAttr = topDiskGeo.getAttribute("position");
    for (var vi = 0; vi < diskVertexCoords.length; vi++) {
      var c = diskVertexCoords[vi];
      var m = homotopyPt(c[0], c[1], 1, s);
      posAttr.setXYZ(vi, m[0], m[2], m[1]);
    }
    posAttr.needsUpdate = true;
    topDiskGeo.computeVertexNormals();

    var ringAttr = ringGeo.getAttribute("position");
    for (var si = 0; si <= N_SEGS; si++) {
      var ang = (si / N_SEGS) * Math.PI * 2;
      var m = homotopyPt(Math.cos(ang), Math.sin(ang), 1, s);
      ringAttr.setXYZ(si, m[0], m[2], m[1]);
    }
    ringAttr.needsUpdate = true;
  }

  function updateRibs(s) {
    for (var k = 0; k < ribs.length; k++) {
      var rib = ribs[k];
      var posAttr = rib.geo.getAttribute("position");
      for (var j = 0; j <= RIB_SEGMENTS; j++) {
        var t = j / RIB_SEGMENTS;
        var m = homotopyPt(rib.x, rib.y, t, s);
        posAttr.setXYZ(j, m[0], m[2], m[1]);
      }
      posAttr.needsUpdate = true;
    }
  }

  /* ── initial render ── */

  updateTopDisk(0);
  updateRibs(0);
  render();

  /* ── orbit drag + scroll zoom ── */

  var spherical = {
    theta: Math.atan2(3.0, 3.2),
    phi: Math.acos(2.4 / Math.sqrt(3.2 * 3.2 + 2.4 * 2.4 + 3.0 * 3.0)),
    radius: Math.sqrt(3.2 * 3.2 + 2.4 * 2.4 + 3.0 * 3.0)
  };
  var dragging = false, lastX = 0, lastY = 0;

  function updateCamera() {
    camera.position.set(
      spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta),
      spherical.radius * Math.cos(spherical.phi),
      spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta)
    );
    camera.lookAt(0, 0.45, 0);
    render();
  }

  canvas.addEventListener("mousedown", function (e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY; e.preventDefault();
  });
  canvas.addEventListener("touchstart", function (e) {
    dragging = true;
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });
  window.addEventListener("mousemove", function (e) {
    if (!dragging) return;
    spherical.theta -= (e.clientX - lastX) * 0.008;
    spherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2,
      spherical.phi - (e.clientY - lastY) * 0.008));
    lastX = e.clientX; lastY = e.clientY;
    updateCamera(); e.preventDefault();
  });
  window.addEventListener("touchmove", function (e) {
    if (!dragging) return;
    var pt = e.touches[0];
    spherical.theta -= (pt.clientX - lastX) * 0.008;
    spherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2,
      spherical.phi - (pt.clientY - lastY) * 0.008));
    lastX = pt.clientX; lastY = pt.clientY;
    updateCamera(); e.preventDefault();
  }, { passive: false });
  window.addEventListener("mouseup", function () { dragging = false; });
  window.addEventListener("touchend", function () { dragging = false; });
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    spherical.radius = Math.max(2, Math.min(12, spherical.radius + e.deltaY * 0.005));
    updateCamera();
  }, { passive: false });

  /* ── slider & animation controls ── */

  var sValue = 0;
  var animId = null;

  function setS(v) {
    sValue = v;
    slider.value = v;
    sLabel.innerHTML = "<i>s</i> = " + v.toFixed(2);
    updateTopDisk(v);
    updateRibs(v);
    render();
  }

  slider.addEventListener("input", function () {
    if (animId) { cancelAnimationFrame(animId); animId = null; btnAnimate.textContent = "Animate"; btnAnimate.style.background = "#eff6ff"; btnAnimate.style.color = "#1d4ed8"; }
    setS(parseFloat(this.value));
  });

  btnAnimate.addEventListener("click", function () {
    if (animId) {
      cancelAnimationFrame(animId); animId = null;
      btnAnimate.textContent = "Animate"; btnAnimate.style.background = "#eff6ff"; btnAnimate.style.color = "#1d4ed8";
      return;
    }
    btnAnimate.textContent = "Pause"; btnAnimate.style.background = "#fee2e2"; btnAnimate.style.color = "#b91c1c";
    var start = null, duration = 3000;
    function step(ts) {
      if (!start) start = ts;
      var t = Math.min((ts - start) / duration, 1);
      var eased = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
      setS(eased);
      if (t < 1) { animId = requestAnimationFrame(step); }
      else { animId = null; btnAnimate.textContent = "Animate"; btnAnimate.style.background = "#eff6ff"; btnAnimate.style.color = "#1d4ed8"; }
    }
    animId = requestAnimationFrame(step);
  });

  btnReset.addEventListener("click", function () {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    btnAnimate.textContent = "Animate"; btnAnimate.style.background = "#eff6ff"; btnAnimate.style.color = "#1d4ed8";
    setS(0);
  });
})();
