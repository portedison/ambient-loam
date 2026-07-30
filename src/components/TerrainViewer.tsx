"use client";

import { Fragment, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type MarkerAnchor = {
  id: string;
  /** WGS84 longitude / latitude of the point on the terrain. */
  lng: number;
  lat: number;
  /** Short paraphrased label describing the place. */
  label: string;
  /** Source attribution. */
  cite: string;
};

export type TerrainViewerProps = {
  /** Vertical exaggeration vs true scale: 1 = real proportions, 2 = twice as tall. */
  exaggeration?: number;
  /** Target render-mesh grid resolution (vertices per side). 512 ≈ 262k verts. */
  resolution?: number;
  /** Annotation points. Pass a stable reference (module-level const). */
  markers?: MarkerAnchor[];
  className?: string;
};

/**
 * z10 4×4 Terrarium tile block over the lower Waitaki (coast in the south-east,
 * ranges in the north-west). ~110 m/px, no API key required.
 */
const TILE = { z: 10, x0: 996, y0: 652, span: 4, size: 256 } as const;

const demTileUrl = (x: number, y: number): string =>
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${TILE.z}/${x}/${y}.png`;
const texTileUrl = (x: number, y: number): string =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${TILE.z}/${y}/${x}`;

/** World-space footprint of the square terrain tile. */
const WORLD_SIZE = 100;
/** Fraction trimmed off the eastern (right) edge, to centre the composition. */
const EAST_CROP = 0.14;
/** East–west footprint after trimming (north–south stays WORLD_SIZE). */
const WORLD_SIZE_X = WORLD_SIZE * (1 - EAST_CROP);

/** Web-Mercator tile row → latitude (degrees). */
function tileYToLat(y: number, z: number): number {
  const t = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(Math.sinh(t));
}
/** Latitude → fractional Web-Mercator tile row. */
function latToTileY(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
}
const tileXToLng = (x: number, z: number): number => (x / 2 ** z) * 360 - 180;

// Real horizontal scale of the block, so elevation can be expressed true-to-scale
// (metres → world units) and then multiplied by an explicit exaggeration factor.
const CENTER_LAT = tileYToLat(TILE.y0 + TILE.span / 2, TILE.z);
const BLOCK_WIDTH_M =
  ((TILE.span * 360) / 2 ** TILE.z) *
  (40075016.686 / 360) *
  Math.cos((CENTER_LAT * Math.PI) / 180);
/** Metres of real terrain per world unit (~1115 m/unit for this block). */
const METRES_PER_UNIT = BLOCK_WIDTH_M / WORLD_SIZE;

// Geographic bounds of the block, for placing markers.
const WEST_LNG = tileXToLng(TILE.x0, TILE.z);
const EAST_LNG = tileXToLng(TILE.x0 + TILE.span, TILE.z);

const EMPTY_MARKERS: MarkerAnchor[] = [];

// Screen-space offset of the label card from its dot.
const LABEL_DX = 26;
const LABEL_DY = -86;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

/** Fetch the TILE.span² block and composite it into one square canvas. */
async function stitchTiles(
  urlFor: (x: number, y: number) => string,
): Promise<HTMLCanvasElement> {
  const full = TILE.span * TILE.size;
  const canvas = document.createElement("canvas");
  canvas.width = full;
  canvas.height = full;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas context unavailable");

  const jobs: Promise<void>[] = [];
  for (let ty = 0; ty < TILE.span; ty++) {
    for (let tx = 0; tx < TILE.span; tx++) {
      jobs.push(
        loadImage(urlFor(TILE.x0 + tx, TILE.y0 + ty))
          .then((img) => {
            ctx.drawImage(img, tx * TILE.size, ty * TILE.size);
          })
          .catch(() => {
            /* tolerate a missing edge tile rather than fail the whole render */
          }),
      );
    }
  }
  await Promise.all(jobs);
  return canvas;
}

/** DOM handles for one marker's overlay elements (positioned imperatively). */
type MarkerElements = {
  dot: HTMLDivElement | null;
  label: HTMLDivElement | null;
  line: SVGLineElement | null;
};

export default function TerrainViewer({
  exaggeration = 2,
  resolution = 512,
  markers = EMPTY_MARKERS,
  className,
}: TerrainViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  // Marker DOM nodes, populated by the JSX ref callbacks, read by the RAF loop.
  const markerEls = useRef<Map<string, MarkerElements>>(new Map());
  const elementsFor = (id: string): MarkerElements => {
    let entry = markerEls.current.get(id);
    if (!entry) {
      entry = { dot: null, label: null, line: null };
      markerEls.current.set(id, entry);
    }
    return entry;
  };

  useEffect(() => {
    const container = containerRef.current;
    const host = canvasHostRef.current;
    if (!container || !host) return;

    let cancelled = false;
    let frameId = 0;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090b0f);

    const camera = new THREE.PerspectiveCamera(
      48,
      container.clientWidth / container.clientHeight,
      0.1,
      4000,
    );
    // Over the ocean (south-east), looking north-west up the valley to the ranges.
    camera.position.set(34, 44, 80);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.panSpeed = 1.4;
    controls.rotateSpeed = 0.9;
    controls.zoomSpeed = 2.4;
    controls.minDistance = 8;
    controls.maxDistance = 420;
    controls.target.set(-3, 2, 22);
    controls.update();

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xfff2dd, 1.15);
    sun.position.set(-1, 1.3, 0.4);
    scene.add(sun);

    // Built asynchronously once the tiles arrive; disposed on teardown.
    let mesh: THREE.Mesh | null = null;
    let geometry: THREE.PlaneGeometry | null = null;
    let material: THREE.MeshStandardMaterial | null = null;
    let texture: THREE.CanvasTexture | null = null;

    const anchors = new Map<string, THREE.Vector3>();
    const occluded = new Map<string, boolean>();
    const labelHeights = new Map<string, number>();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    // Project anchors to screen space and move the DOM overlay each frame.
    // Occlusion (marker behind a ridge) is raycast against the terrain, throttled
    // to every 4th frame to keep it cheap.
    const projected = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const toAnchor = new THREE.Vector3();
    let frame = 0;

    const setVisible = (els: MarkerElements, visible: boolean) => {
      const display = visible ? "" : "none";
      if (els.dot) els.dot.style.display = display;
      if (els.label) els.label.style.display = display;
      if (els.line) els.line.style.display = display;
    };

    const updateMarkers = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      frame += 1;
      const testOcclusion = mesh !== null && frame % 4 === 0;

      for (const marker of markers) {
        const els = markerEls.current.get(marker.id);
        const anchor = anchors.get(marker.id);
        if (!els || !els.dot || !els.label || !els.line) continue;
        if (!anchor) {
          setVisible(els, false);
          continue;
        }

        projected.copy(anchor).project(camera);
        const behind = projected.z > 1;

        if (testOcclusion && !behind && mesh) {
          const distance = camera.position.distanceTo(anchor);
          toAnchor.copy(anchor).sub(camera.position).normalize();
          raycaster.set(camera.position, toAnchor);
          raycaster.far = Math.max(0.01, distance - 0.5);
          occluded.set(marker.id, raycaster.intersectObject(mesh, false).length > 0);
        }

        if (behind || occluded.get(marker.id)) {
          setVisible(els, false);
          continue;
        }

        setVisible(els, true);
        const sx = (projected.x * 0.5 + 0.5) * w;
        const sy = (-projected.y * 0.5 + 0.5) * h;
        const lx = sx + LABEL_DX;
        const ly = sy + LABEL_DY;
        els.dot.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
        els.label.style.transform = `translate(${lx}px, ${ly}px)`;
        let lh = labelHeights.get(marker.id) ?? 0;
        if (lh === 0) {
          lh = els.label.offsetHeight;
          labelHeights.set(marker.id, lh);
        }
        els.line.setAttribute("x1", `${sx}`);
        els.line.setAttribute("y1", `${sy}`);
        els.line.setAttribute("x2", `${lx}`);
        els.line.setAttribute("y2", `${ly + lh}`);
      }
    };

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      updateMarkers();
    };

    void (async () => {
      const [demCanvas, texCanvas] = await Promise.all([
        stitchTiles(demTileUrl),
        stitchTiles(texTileUrl),
      ]);
      if (cancelled) return;

      const n = demCanvas.width;
      const demCtx = demCanvas.getContext("2d", { willReadFrequently: true });
      if (!demCtx) throw new Error("2D canvas context unavailable");
      const data = demCtx.getImageData(0, 0, n, n).data;

      // Decode Terrarium RGB → metres; clamp sea (< 0) to 0 so the ocean is flat.
      const elevation = new Float32Array(n * n);
      let max = 0;
      for (let i = 0; i < n * n; i++) {
        let elev =
          data[i * 4] * 256 + data[i * 4 + 1] + data[i * 4 + 2] / 256 - 32768;
        if (elev < 0) elev = 0;
        elevation[i] = elev;
        if (elev > max) max = elev;
      }

      // Place each marker on the real terrain surface.
      for (const marker of markers) {
        const u = (marker.lng - WEST_LNG) / (EAST_LNG - WEST_LNG);
        const v = (latToTileY(marker.lat, TILE.z) - TILE.y0) / TILE.span;
        const col = Math.min(n - 1, Math.max(0, Math.round(u * (n - 1))));
        const row = Math.min(n - 1, Math.max(0, Math.round(v * (n - 1))));
        const metres = elevation[row * n + col];
        anchors.set(
          marker.id,
          new THREE.Vector3(
            u * WORLD_SIZE - 0.5 * WORLD_SIZE_X,
            (metres / METRES_PER_UNIT) * exaggeration + 0.4,
            (v - 0.5) * WORLD_SIZE,
          ),
        );
      }

      const step = Math.max(1, Math.floor(n / resolution));
      const usedW = Math.round(n * (1 - EAST_CROP)); // keep only the western part
      const segX = Math.floor(usedW / step) - 1;
      const segZ = Math.floor(n / step) - 1;
      const geo = new THREE.PlaneGeometry(WORLD_SIZE_X, WORLD_SIZE, segX, segZ);
      const position = geo.attributes.position as THREE.BufferAttribute;
      for (let row = 0; row <= segZ; row++) {
        for (let col = 0; col <= segX; col++) {
          const sr = row * step;
          const sc = col * step;
          let sum = 0;
          let count = 0;
          for (let dr = 0; dr < step; dr++) {
            for (let dc = 0; dc < step; dc++) {
              sum += elevation[(sr + dr) * n + (sc + dc)];
              count++;
            }
          }
          position.setZ(
            row * (segX + 1) + col,
            (sum / count / METRES_PER_UNIT) * exaggeration,
          );
        }
      }
      geo.computeVertexNormals();

      const tex = new THREE.CanvasTexture(texCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      tex.repeat.set(1 - EAST_CROP, 1); // show only the kept (western) strip
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 1,
        metalness: 0,
      });

      const built = new THREE.Mesh(geo, mat);
      built.rotation.x = -Math.PI / 2; // lay flat: +Y up, +X east, −X west

      if (cancelled) {
        geo.dispose();
        mat.dispose();
        tex.dispose();
        return;
      }
      geometry = geo;
      material = mat;
      texture = tex;
      mesh = built;
      scene.add(built);

      // Lift the look-at toward the ranges' real height.
      const peakUnits = (max / METRES_PER_UNIT) * exaggeration;
      controls.target.set(-3, peakUnits * 0.5, 22);
      controls.update();
    })().catch((err: unknown) => {
      console.error("[TerrainViewer] failed to build terrain:", err);
    });

    animate();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      if (mesh) scene.remove(mesh);
      geometry?.dispose();
      material?.dispose();
      texture?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [exaggeration, resolution, markers]);

  return (
    <div ref={containerRef} className={className}>
      <div ref={canvasHostRef} className="absolute inset-0" />

      {/* Marker overlay: React structure + Tailwind styling; positions are set
          imperatively via refs in the render loop (no per-frame re-renders). */}
      <div className="pointer-events-none absolute inset-0 overflow-visible">
        <svg className="absolute inset-0 h-full w-full overflow-visible">
          {markers.map((marker) => (
            <line
              key={marker.id}
              ref={(el) => {
                elementsFor(marker.id).line = el;
              }}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth={1}
              style={{ display: "none" }}
            />
          ))}
        </svg>

        {markers.map((marker) => (
          <Fragment key={marker.id}>
            <div
              ref={(el) => {
                elementsFor(marker.id).dot = el;
              }}
              style={{ display: "none" }}
              className="absolute left-0 top-0 h-[11px] w-[11px] rounded-full bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.18),0_1px_4px_rgba(0,0,0,0.6)] will-change-transform"
            />
            <div
              ref={(el) => {
                elementsFor(marker.id).label = el;
              }}
              style={{ display: "none" }}
              className="absolute left-0 top-0 max-w-[236px] rounded-lg border border-white/10 bg-[#0a0c10]/80 px-2.5 py-[7px] backdrop-blur-[6px] will-change-transform"
            >
              <p className="text-[12px] font-medium leading-[1.4] text-[#f3efe6]">
                {marker.label}
              </p>
              <p className="mt-1 text-[10px] italic leading-[1.3] text-[#f3efe6]/60">
                {marker.cite}
              </p>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
