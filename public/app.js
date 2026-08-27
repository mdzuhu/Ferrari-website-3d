/**
 * FERRARI SF-24 SCROLLYTELLING & TELEMETRY ENGINE
 * Apple-Level Luxury Web Experience & Interactive CAD Simulator
 */

// Global State
const state = {
  frames: [],
  totalFrames: 90,
  imagesLoaded: 0,
  currentFrameIndex: 0,
  isAudioMuted: true,
  audioEngine: null,
  activeHotspot: null,
  explodedAmount: 0.5,
  activeCadMode: 'exploded', // 'exploded' | 'wireframe' | 'thermal' | 'aero'
  activeSubAssembly: 'all',
  telemetryPlaying: true,
  telemetryCircuit: 'monza',
  telemetryLapTime: 0,
  lenisInstance: null
};

// -------------------------------------------------------------
// 1. ASSET PRELOADER & SCROLLYTELLING CANVAS
// -------------------------------------------------------------
const canvas = document.getElementById('scrolly-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const preloaderEl = document.getElementById('preloader');
const preloaderBar = document.getElementById('preloader-bar');
const preloaderPercent = document.getElementById('preloader-percent');

let canvasMetrics = {
  cw: 0,
  ch: 0,
  dw: 0,
  dh: 0,
  dx: 0,
  dy: 0
};

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.parentElement.getBoundingClientRect();
  const cw = rect.width;
  const ch = rect.height;

  canvas.width = cw * dpr;
  canvas.height = ch * dpr;
  ctx.scale(dpr, dpr);

  const imgAspect = 800 / 450;
  const canvasAspect = cw / ch;

  let dw, dh, dx, dy;
  if (canvasAspect > imgAspect) {
    dh = ch * 0.88;
    dw = dh * imgAspect;
    dx = (cw - dw) / 2;
    dy = (ch - dh) / 2;
  } else {
    dw = cw * 0.94;
    dh = dw / imgAspect;
    dx = (cw - dw) / 2;
    dy = (ch - dh) / 2;
  }

  canvasMetrics = { cw, ch, dw, dh, dx, dy };
  renderCurrentFrame();
  updateHotspotCoordinates();
}

function initScrollySequence() {
  if (!canvas || !ctx) return;

  window.addEventListener('resize', resizeCanvas);

  // Preload frames from Node.js backend API
  for (let i = 0; i < state.totalFrames; i++) {
    const img = new Image();
    const frameNum = String(i).padStart(3, '0');
    img.src = `/api/frames/${frameNum}`;
    img.onload = () => {
      state.imagesLoaded++;
      const progress = Math.round((state.imagesLoaded / state.totalFrames) * 100);
      if (preloaderBar) preloaderBar.style.width = `${progress}%`;
      if (preloaderPercent) preloaderPercent.textContent = `${progress}%`;

      if (state.imagesLoaded === 1) {
        resizeCanvas();
      }

      if (state.imagesLoaded === state.totalFrames) {
        onAllFramesLoaded();
      }
    };
    img.onerror = () => {
      state.imagesLoaded++;
      if (state.imagesLoaded === state.totalFrames) {
        onAllFramesLoaded();
      }
    };
    state.frames.push(img);
  }
}

function onAllFramesLoaded() {
  if (preloaderEl) {
    preloaderEl.style.opacity = '0';
    preloaderEl.style.pointerEvents = 'none';
    setTimeout(() => {
      preloaderEl.style.display = 'none';
      revealHeroBanner();
    }, 600);
  } else {
    revealHeroBanner();
  }

  resizeCanvas();
  setupScrollTriggerAnimation();
  renderCurrentFrame();
}

function revealHeroBanner() {
  const heroCard = document.getElementById('hero-banner-content');
  if (heroCard && typeof gsap !== 'undefined') {
    gsap.fromTo(
      heroCard.children,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out' }
    );
  }
}

function renderCurrentFrame() {
  if (!canvas || !ctx || state.frames.length === 0) return;

  const img = state.frames[state.currentFrameIndex];
  if (!img || !img.complete) return;

  const { cw, ch, dw, dh, dx, dy } = canvasMetrics;
  if (cw === 0 || ch === 0) return;

  // Enable high-DPI image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Clear with pitch-black #050505
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, cw, ch);

  ctx.drawImage(img, dx, dy, dw, dh);
}

// -------------------------------------------------------------
// 2. GSAP SCROLLTRIGGER & LENIS SMOOTH SCROLL
// -------------------------------------------------------------
function initSmoothScroll() {
  if (typeof Lenis !== 'undefined') {
    state.lenisInstance = new Lenis({
      duration: 1.3,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.5,
      infinite: false
    });

    // Synchronize Lenis with GSAP ScrollTrigger
    if (typeof ScrollTrigger !== 'undefined') {
      state.lenisInstance.on('scroll', ScrollTrigger.update);
    }

    // Connect Lenis to GSAP single ticker
    if (typeof gsap !== 'undefined') {
      gsap.ticker.add((time) => {
        state.lenisInstance.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) {
        state.lenisInstance.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }

    // Intercept anchor clicks for ultra-smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#' || !targetId) return;
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          state.lenisInstance.scrollTo(targetEl, {
            offset: -10,
            duration: 1.4,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
          });
          const mobileDrawer = document.getElementById('mobile-drawer');
          if (mobileDrawer && !mobileDrawer.classList.contains('hidden')) {
            mobileDrawer.classList.add('hidden');
          }
        }
      });
    });
  }
}

function setupScrollTriggerAnimation() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  const scrollyContainer = document.getElementById('scrolly-container');
  const scrollyCanvasWrapper = document.getElementById('scrolly-canvas-wrapper');

  if (!scrollyContainer || !scrollyCanvasWrapper) return;

  // Smooth frame proxy object
  const frameObj = { frame: 0 };

  gsap.to(frameObj, {
    frame: state.totalFrames - 1,
    ease: 'none',
    scrollTrigger: {
      trigger: scrollyContainer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.7,
      pin: scrollyCanvasWrapper,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const frameIndex = Math.min(
          state.totalFrames - 1,
          Math.max(0, Math.round(frameObj.frame))
        );
        if (frameIndex !== state.currentFrameIndex) {
          state.currentFrameIndex = frameIndex;
          renderCurrentFrame();
        }
        updateActiveStoryBeat(self.progress);
      }
    }
  });

  // Initial state trigger
  updateActiveStoryBeat(0);
}

function applyCardState(el, cardState) {
  if (!el) return;
  if (!cardState.active) {
    el.style.opacity = '0';
    el.style.display = 'none';
    el.style.pointerEvents = 'none';
    el.style.transform = `translate3d(0, ${cardState.y}px, 0)`;
  } else {
    el.style.display = el.id === 'beat-02' || el.id === 'beat-04' ? 'block' : 'block';
    el.style.opacity = cardState.opacity.toFixed(3);
    el.style.transform = `translate3d(0, ${cardState.y.toFixed(1)}px, 0)`;
    el.style.pointerEvents = cardState.opacity > 0.4 ? 'auto' : 'none';
  }
}

function calcBeatState(progress, start, end, fadeInLen = 0.035, fadeOutLen = 0.035) {
  if (progress < start - fadeInLen || progress > end + fadeOutLen) {
    return { opacity: 0, y: 30, active: false };
  }
  if (progress >= start && progress <= end) {
    return { opacity: 1, y: 0, active: true };
  }
  if (progress < start) {
    const t = (progress - (start - fadeInLen)) / fadeInLen;
    const clampedT = Math.max(0, Math.min(1, t));
    return { opacity: clampedT, y: (1 - clampedT) * 26, active: true };
  } else {
    const t = (progress - end) / fadeOutLen;
    const clampedT = Math.max(0, Math.min(1, t));
    return { opacity: 1 - clampedT, y: -clampedT * 26, active: true };
  }
}

function updateActiveStoryBeat(progress) {
  // 1. Update progress indicator bar
  const indicator = document.getElementById('scrolly-progress-bar');
  if (indicator) indicator.style.width = `${Math.min(100, progress * 100)}%`;

  // 2. Synchronized Non-Overlapping Cross-Fading Story Cards
  const heroCard = document.getElementById('hero-banner-content');
  const beat01 = document.getElementById('beat-01');
  const beat02 = document.getElementById('beat-02');
  const beat03 = document.getElementById('beat-03');
  const beat04 = document.getElementById('beat-04');
  const beat05 = document.getElementById('beat-05');

  // Hero: Active 0.00 -> 0.10, fades out 0.10 -> 0.14
  const heroState = calcBeatState(progress, 0.00, 0.10, 0.0, 0.04);
  applyCardState(heroCard, heroState);

  // Beat 01: Fades in 0.13 -> 0.16, Active 0.16 -> 0.30, Fades out 0.30 -> 0.33
  const b1State = calcBeatState(progress, 0.16, 0.30, 0.03, 0.03);
  applyCardState(beat01, b1State);

  // Beat 02: Fades in 0.33 -> 0.36, Active 0.36 -> 0.50, Fades out 0.50 -> 0.53
  const b2State = calcBeatState(progress, 0.36, 0.50, 0.03, 0.03);
  applyCardState(beat02, b2State);

  // Beat 03: Fades in 0.53 -> 0.56, Active 0.56 -> 0.70, Fades out 0.70 -> 0.73
  const b3State = calcBeatState(progress, 0.56, 0.70, 0.03, 0.03);
  applyCardState(beat03, b3State);

  // Beat 04: Fades in 0.73 -> 0.76, Active 0.76 -> 0.88, Fades out 0.88 -> 0.91
  const b4State = calcBeatState(progress, 0.76, 0.88, 0.03, 0.03);
  applyCardState(beat04, b4State);

  // Beat 05: Fades in 0.91 -> 0.94, Active 0.94 -> 1.00
  const b5State = calcBeatState(progress, 0.94, 1.00, 0.03, 0.0);
  applyCardState(beat05, b5State);

  // 3. Update chapter number & HUD Title
  const chapterNumber = document.getElementById('active-chapter-num');
  const chapterTitle = document.getElementById('active-chapter-title');
  if (chapterNumber && chapterTitle) {
    if (progress < 0.14) {
      chapterNumber.textContent = '00 / 05';
      chapterTitle.textContent = 'SF-24 OVERVIEW';
    } else if (progress < 0.34) {
      chapterNumber.textContent = '01 / 05';
      chapterTitle.textContent = 'MONOCOQUE CORE';
    } else if (progress < 0.54) {
      chapterNumber.textContent = '02 / 05';
      chapterTitle.textContent = 'EXPLODED HYBRID POWERTRAIN';
    } else if (progress < 0.74) {
      chapterNumber.textContent = '03 / 05';
      chapterTitle.textContent = 'GROUND-EFFECT AERODYNAMICS';
    } else if (progress < 0.92) {
      chapterNumber.textContent = '04 / 05';
      chapterTitle.textContent = 'BI-DIRECTIONAL TELEMETRY';
    } else {
      chapterNumber.textContent = '05 / 05';
      chapterTitle.textContent = 'MARANELLO VICTORY TRIM';
    }
  }

  // 4. Toggle Hotspot Visibility during exploded deconstruction phase
  const hotspotContainer = document.getElementById('canvas-hotspots');
  if (hotspotContainer) {
    if (progress >= 0.32 && progress <= 0.68) {
      hotspotContainer.style.opacity = '1';
      hotspotContainer.style.pointerEvents = 'auto';
    } else {
      hotspotContainer.style.opacity = '0';
      hotspotContainer.style.pointerEvents = 'none';
    }
  }
}

// -------------------------------------------------------------
// 3. INTERACTIVE HOTSPOTS SYSTEM
// -------------------------------------------------------------
const hotspotsData = [
  {
    id: 'front-wing',
    name: 'Front Wing & Vortex Generators',
    subtitle: 'High-Downforce Multi-Element Carbon Plane',
    xRatio: 0.18,
    yRatio: 0.62,
    specs: [
      { label: 'Downforce Contribution', val: '38%' },
      { label: 'Carbon Layers', val: '14 Ultra-Thin Plies' },
      { label: 'Outwash Tuning', val: 'Active Y250 Vortex Management' }
    ],
    desc: 'Engineered with sculpted cascade endplates that channel turbulent wake away from the front 18-inch Pirelli wheels while feeding optimal laminar airflow into the underfloor Venturi inlets.'
  },
  {
    id: 'halo-safety',
    name: 'Titanium Halo Structural Cage',
    subtitle: 'Grade 5 3D-Printed Titanium Safety Monocoque',
    xRatio: 0.47,
    yRatio: 0.45,
    specs: [
      { label: 'Static Load Rating', val: '125 kN (12.7 Tonnes)' },
      { label: 'Component Weight', val: '7.0 kg' },
      { label: 'Aero Fairing', val: 'Sub-millimeter Carbon Winglet' }
    ],
    desc: 'Capable of supporting the weight of two London double-decker buses, the Halo features an aerodynamic carbon cowl that mitigates airbox turbulence without compromising pilot visibility.'
  },
  {
    id: 'v6-power-unit',
    name: 'Ferrari 066/12 1.6L V6 Turbo Hybrid',
    subtitle: '1,020+ Combined Horsepower at 15,000 RPM',
    xRatio: 0.64,
    yRatio: 0.48,
    specs: [
      { label: 'Thermal Efficiency', val: '> 52%' },
      { label: 'Electric Boost (MGU-K)', val: '120 kW (163 HP)' },
      { label: 'Turbo Speed', val: '125,000 RPM' }
    ],
    desc: 'The pinnacle of Internal Combustion & Hybrid engineering. Utilizes Mahle Turbulent Jet Ignition, direct fuel injection at 500 bar, and simultaneous MGU-H/MGU-K energy harvesting.'
  },
  {
    id: 'rear-drs',
    name: 'Active DRS Rear Wing & Diffuser',
    subtitle: 'Dual-Stage Drag Reduction System',
    xRatio: 0.88,
    yRatio: 0.52,
    specs: [
      { label: 'DRS Speed Delta', val: '+18 to +24 km/h' },
      { label: 'Actuation Time', val: '0.12 Seconds' },
      { label: 'Rear Beam Wing', val: 'Double Cascade Carbon' }
    ],
    desc: 'Hydraulically actuated top flap opens up to 85mm in DRS activation zones, dumping aerodynamic drag instantly for high-velocity straight-line overtaking on circuits like Monza.'
  }
];

function updateHotspotCoordinates() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const parent = canvas.parentElement;
  if (!parent) return;

  hotspotsData.forEach((spot) => {
    const el = document.getElementById(`hotspot-${spot.id}`);
    if (el) {
      el.style.left = `${spot.xRatio * 100}%`;
      el.style.top = `${spot.yRatio * 100}%`;
    }
  });
}

function initHotspots() {
  const container = document.getElementById('canvas-hotspots');
  if (!container) return;

  container.innerHTML = '';
  hotspotsData.forEach((spot) => {
    const pin = document.createElement('button');
    pin.id = `hotspot-${spot.id}`;
    pin.className = 'absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-30 focus:outline-none';
    pin.setAttribute('aria-label', spot.name);
    pin.innerHTML = `
      <div class="relative flex items-center justify-center">
        <span class="hotspot-pin absolute w-8 h-8 rounded-full bg-cyan-400/20 border border-cyan-400/50"></span>
        <span class="w-3.5 h-3.5 rounded-full bg-cyan-400 group-hover:bg-white shadow-[0_0_12px_#00d6ff] transition-all duration-300"></span>
        <span class="absolute left-6 ml-2 px-3 py-1.5 rounded-md glass-panel text-[11px] font-mono tracking-wider text-white/90 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none border border-cyan-500/30">
          <span class="text-cyan-400 mr-1.5">+</span>${spot.name}
        </span>
      </div>
    `;

    pin.addEventListener('click', () => openHotspotModal(spot));
    container.appendChild(pin);
  });

  updateHotspotCoordinates();
}

function openHotspotModal(spot) {
  state.activeHotspot = spot;
  const modal = document.getElementById('hotspot-modal');
  const title = document.getElementById('hotspot-modal-title');
  const subtitle = document.getElementById('hotspot-modal-subtitle');
  const desc = document.getElementById('hotspot-modal-desc');
  const specsGrid = document.getElementById('hotspot-modal-specs');

  if (!modal) return;

  if (title) title.textContent = spot.name;
  if (subtitle) subtitle.textContent = spot.subtitle;
  if (desc) desc.textContent = spot.desc;

  if (specsGrid) {
    specsGrid.innerHTML = spot.specs
      .map(
        (s) => `
      <div class="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
        <div class="text-[10px] font-mono tracking-widest text-white/40 uppercase">${s.label}</div>
        <div class="text-sm font-bold text-cyan-400 font-mono mt-0.5">${s.val}</div>
      </div>
    `
      )
      .join('');
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeHotspotModal() {
  const modal = document.getElementById('hotspot-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// 4. INTERACTIVE CAD EXPLODED VIEW LAB
// -------------------------------------------------------------
const cadCanvas = document.getElementById('cad-explorer-canvas');
const cadCtx = cadCanvas ? cadCanvas.getContext('2d') : null;
const cadBaseImage = new Image();

// Fetch base image from Node.js backend API
cadBaseImage.src = '/api/base-image';

// Redraw canvas once base image loads
cadBaseImage.onload = () => {
  renderCadExplorer();
};

// Component definition with increased explosion displacement offsets (ox, oy)
const cadComponents = {
  front_wing: { src: '/api/components/front_wing.png', ox: -120, oy: 60, label: 'Aero Front Wing' },
  monocoque_chassis: { src: '/api/components/monocoque_chassis.png', ox: 0, oy: 0, label: 'Carbon Monocoque' },
  v6_turbo_hybrid: { src: '/api/components/v6_turbo_hybrid.png', ox: 80, oy: -100, label: '066/12 Power Unit' },
  halo_safety: { src: '/api/components/halo_safety.png', ox: -20, oy: -80, label: 'Titanium Halo' },
  rear_wing_drs: { src: '/api/components/rear_wing_drs.png', ox: 100, oy: -90, label: 'DRS Rear Assembly' },
  pirelli_wheels: { src: '/api/components/pirelli_wheels.png', ox: 0, oy: 50, label: 'Pirelli 18" Wheels' }
};

const loadedCadImages = {};
Object.entries(cadComponents).forEach(([key, val]) => {
  const img = new Image();
  img.src = val.src;
  // Redraw canvas automatically as each component image loads
  img.onload = () => {
    renderCadExplorer();
  };
  loadedCadImages[key] = img;
});

function initCadExplorer() {
  if (!cadCanvas || !cadCtx) return;

  function resizeCadCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = cadCanvas.parentElement.getBoundingClientRect();
    cadCanvas.width = rect.width * dpr;
    cadCanvas.height = (rect.width * 0.52) * dpr;
    cadCtx.scale(dpr, dpr);
    renderCadExplorer();
  }

  window.addEventListener('resize', resizeCadCanvas);
  setTimeout(resizeCadCanvas, 100);

  // Explode slider listener
  const slider = document.getElementById('cad-explode-slider');
  const sliderVal = document.getElementById('cad-explode-value');
  if (slider) {
    slider.addEventListener('input', (e) => {
      state.explodedAmount = parseFloat(e.target.value) / 100;
      if (sliderVal) sliderVal.textContent = `${e.target.value}%`;
      renderCadExplorer();
    });
  }

  // CAD Mode Buttons
  const modeButtons = document.querySelectorAll('[data-cad-mode]');
  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      modeButtons.forEach((b) => b.classList.remove('bg-cyan-500/20', 'border-cyan-400', 'text-cyan-400'));
      btn.classList.add('bg-cyan-500/20', 'border-cyan-400', 'text-cyan-400');
      state.activeCadMode = btn.getAttribute('data-cad-mode');
      renderCadExplorer();
    });
  });

  // Sub-Assembly Buttons
  const subButtons = document.querySelectorAll('[data-subassembly]');
  subButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      subButtons.forEach((b) => b.classList.remove('bg-red-600/20', 'border-red-500', 'text-red-400'));
      btn.classList.add('bg-red-600/20', 'border-red-500', 'text-red-400');
      state.activeSubAssembly = btn.getAttribute('data-subassembly');
      renderCadExplorer();
      updateSubAssemblyDetails(state.activeSubAssembly);
    });
  });
}

function renderCadExplorer() {
  if (!cadCanvas || !cadCtx) return;

  const rect = cadCanvas.parentElement.getBoundingClientRect();
  const cw = rect.width;
  const ch = rect.width * 0.52;

  // Clear background
  cadCtx.fillStyle = '#050505';
  cadCtx.fillRect(0, 0, cw, ch);

  // Background Blueprint Grid for CAD feel
  cadCtx.strokeStyle = 'rgba(0, 214, 255, 0.05)';
  cadCtx.lineWidth = 1;
  const gridSize = 24;
  for (let x = 0; x < cw; x += gridSize) {
    cadCtx.beginPath();
    cadCtx.moveTo(x, 0);
    cadCtx.lineTo(x, ch);
    cadCtx.stroke();
  }
  for (let y = 0; y < ch; y += gridSize) {
    cadCtx.beginPath();
    cadCtx.moveTo(0, y);
    cadCtx.lineTo(cw, y);
    cadCtx.stroke();
  }

  // Draw Base or Exploded Components
  const dw = cw * 0.88;
  const dh = (dw / 800) * 450;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;

  const factor = state.explodedAmount;

  if (state.activeCadMode === 'wireframe') {
    // Holographic wireframe CAD shader effect
    cadCtx.filter = 'grayscale(100%) brightness(1.6) contrast(200%)';
    cadCtx.drawImage(cadBaseImage, dx, dy, dw, dh);
    cadCtx.filter = 'none';

    // Add cyan holographic scan lines
    cadCtx.fillStyle = 'rgba(0, 214, 255, 0.12)';
    for (let y = dy; y < dy + dh; y += 4) {
      cadCtx.fillRect(dx, y, dw, 1);
    }
  } else if (state.activeCadMode === 'thermal') {
    // Thermal heat map filter (engine + brakes glow red/yellow)
    cadCtx.drawImage(cadBaseImage, dx, dy, dw, dh);
    
    // Thermal overlay on power unit
    const gradEngine = cadCtx.createRadialGradient(dx + dw * 0.65, dy + dh * 0.55, 10, dx + dw * 0.65, dy + dh * 0.55, 80);
    gradEngine.addColorStop(0, 'rgba(255, 50, 0, 0.7)');
    gradEngine.addColorStop(0.5, 'rgba(255, 180, 0, 0.4)');
    gradEngine.addColorStop(1, 'transparent');
    cadCtx.fillStyle = gradEngine;
    cadCtx.fillRect(dx, dy, dw, dh);

    // Front & rear brake heat
    const gradBrakeF = cadCtx.createRadialGradient(dx + dw * 0.31, dy + dh * 0.75, 5, dx + dw * 0.31, dy + dh * 0.75, 40);
    gradBrakeF.addColorStop(0, 'rgba(255, 230, 0, 0.8)');
    gradBrakeF.addColorStop(1, 'transparent');
    cadCtx.fillStyle = gradBrakeF;
    cadCtx.fillRect(dx, dy, dw, dh);

    const gradBrakeR = cadCtx.createRadialGradient(dx + dw * 0.95, dy + dh * 0.75, 5, dx + dw * 0.95, dy + dh * 0.75, 40);
    gradBrakeR.addColorStop(0, 'rgba(255, 230, 0, 0.8)');
    gradBrakeR.addColorStop(1, 'transparent');
    cadCtx.fillStyle = gradBrakeR;
    cadCtx.fillRect(dx, dy, dw, dh);
  } else if (state.activeCadMode === 'aero') {
    // Aerodynamic streamline mode
    cadCtx.drawImage(cadBaseImage, dx, dy, dw, dh);
    
    // Draw flowing particle streamlines
    cadCtx.strokeStyle = 'rgba(0, 214, 255, 0.6)';
    cadCtx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const startY = dy + dh * (0.35 + i * 0.06);
      cadCtx.beginPath();
      cadCtx.moveTo(dx, startY);
      cadCtx.bezierCurveTo(
        dx + dw * 0.3, startY - 20,
        dx + dw * 0.7, startY + 10,
        dx + dw, startY - 30
      );
      cadCtx.stroke();
    }
  } else {
    // Standard Exploded Multi-Layer CAD rendering
    if (factor < 0.05 && state.activeSubAssembly === 'all') {
      cadCtx.drawImage(cadBaseImage, dx, dy, dw, dh);
    } else {
      // Draw ghost monocoque chassis
      cadCtx.globalAlpha = 0.4;
      cadCtx.drawImage(cadBaseImage, dx, dy, dw, dh);
      cadCtx.globalAlpha = 1.0;

      // Draw separated components with displacement
      Object.entries(cadComponents).forEach(([key, comp]) => {
        const isSelected = state.activeSubAssembly === 'all' || state.activeSubAssembly === key;
        const img = loadedCadImages[key];
        if (!img || !img.complete) return;

        const offX = comp.ox * factor * (dw / 800);
        const offY = comp.oy * factor * (dh / 450);

        cadCtx.globalAlpha = isSelected ? 1.0 : 0.2;
        cadCtx.drawImage(img, dx + offX, dy + offY, dw, dh);

        // Leader lines and coordinates when exploded
        if (factor > 0.3 && isSelected) {
          cadCtx.strokeStyle = 'rgba(0, 214, 255, 0.7)';
          cadCtx.lineWidth = 1;
          cadCtx.setLineDash([3, 3]);
          cadCtx.beginPath();
          cadCtx.moveTo(dx + dw * 0.5 + offX * 0.5, dy + dh * 0.5 + offY * 0.5);
          cadCtx.lineTo(dx + dw * 0.5, dy + dh * 0.5);
          cadCtx.stroke();
          cadCtx.setLineDash([]);
        }
      });
      cadCtx.globalAlpha = 1.0;
    }
  }
}

function updateSubAssemblyDetails(assemblyKey) {
  const details = {
    all: {
      title: 'Scuderia Ferrari SF-24 Integrated Chassis',
      code: 'CHASSIS-SF24-001',
      weight: '798 kg (with driver)',
      desc: 'Complete carbon-fibre and honeycomb composite structure compliant with 2024/2025 FIA Technical Regulations.'
    },
    front_wing: {
      title: 'Front Wing Aerodynamic Plane & Endplates',
      code: 'AERO-FW-EVO3',
      weight: '9.8 kg',
      desc: 'Carbon composite quad-plane aerofoil with sculpted ground outwash vortex generators and FIA-spec nosecone impact crash box.'
    },
    monocoque_chassis: {
      title: 'Maranello Carbon Monocoque Tub',
      code: 'MONO-SF24-C9',
      weight: '62.4 kg',
      desc: 'Autoclaved carbon-fibre sandwich monocoque containing Kevlar anti-penetration panels and 50G FIA side-impact crash spars.'
    },
    v6_turbo_hybrid: {
      title: 'Ferrari 066/12 90° V6 Turbo Hybrid Power Unit',
      code: 'PU-066/12-HYB',
      weight: '150 kg (FIA minimum limit)',
      desc: '1.6L internal combustion engine with 15,000 RPM redline, paired to dual MGU-K and MGU-H energy recovery systems generating >1020 HP.'
    },
    halo_safety: {
      title: 'Titanium Halo Driver Protection Structure',
      code: 'HALO-TITAN-G5',
      weight: '7.0 kg',
      desc: 'Additive-manufactured Grade 5 titanium structure tested to 125 kN static overhead and lateral impact loads.'
    },
    rear_wing_drs: {
      title: 'High-Downforce DRS Rear Wing & Diffuser Assembly',
      code: 'DRS-RW-MONZA',
      weight: '12.2 kg',
      desc: 'Hydraulic carbon DRS actuator with dual beam-wings tuned to maximize low-pressure air extraction from the floor Venturi tunnels.'
    },
    pirelli_wheels: {
      title: '18-Inch BBS Forged Magnesium Wheels & Carbon Brakes',
      code: 'WHEEL-BBS-18',
      weight: '18.5 kg / set',
      desc: 'Forged magnesium rims wrapped in Pirelli P-Zero slicks with Brembo 6-piston monobloc calipers and carbon-carbon discs.'
    }
  };

  const current = details[assemblyKey] || details.all;
  const titleEl = document.getElementById('cad-detail-title');
  const codeEl = document.getElementById('cad-detail-code');
  const weightEl = document.getElementById('cad-detail-weight');
  const descEl = document.getElementById('cad-detail-desc');

  if (titleEl) titleEl.textContent = current.title;
  if (codeEl) codeEl.textContent = current.code;
  if (weightEl) weightEl.textContent = current.weight;
  if (descEl) descEl.textContent = current.desc;
}

// -------------------------------------------------------------
// 5. REAL-TIME TELEMETRY SIMULATOR & LAP GRAPH
// -------------------------------------------------------------
const telemetryCanvas = document.getElementById('telemetry-chart-canvas');
const tCtx = telemetryCanvas ? telemetryCanvas.getContext('2d') : null;

const circuitTelemetry = {
  monza: {
    lapName: 'Autodromo Nazionale Monza - Lap 14/53',
    length: '5.793 km',
    points: 120,
    speedProfile: [280, 310, 345, 355, 110, 85, 140, 260, 320, 240, 270, 335, 160, 195, 290, 340, 145, 230, 310, 350]
  },
  monaco: {
    lapName: 'Circuit de Monaco - Lap 32/78',
    length: '3.337 km',
    points: 120,
    speedProfile: [140, 180, 260, 75, 120, 220, 60, 110, 160, 80, 130, 270, 95, 170, 210, 150, 240, 100, 180, 265]
  }
};

let telemetryFrame = 0;

function initTelemetryDashboard() {
  if (!telemetryCanvas || !tCtx) return;

  function resizeTelemetry() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = telemetryCanvas.parentElement.getBoundingClientRect();
    telemetryCanvas.width = rect.width * dpr;
    telemetryCanvas.height = 140 * dpr;
    tCtx.scale(dpr, dpr);
  }

  window.addEventListener('resize', resizeTelemetry);
  resizeTelemetry();

  // Circuit toggle
  const circuitBtns = document.querySelectorAll('[data-circuit]');
  circuitBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      circuitBtns.forEach((b) => b.classList.remove('bg-white/10', 'text-cyan-400'));
      btn.classList.add('bg-white/10', 'text-cyan-400');
      state.telemetryCircuit = btn.getAttribute('data-circuit');
      const nameEl = document.getElementById('telemetry-circuit-name');
      if (nameEl && circuitTelemetry[state.telemetryCircuit]) {
        nameEl.textContent = circuitTelemetry[state.telemetryCircuit].lapName;
      }
    });
  });

  // Telemetry loop
  function updateTelemetryLoop() {
    telemetryFrame = (telemetryFrame + 1) % 400;
    const normT = telemetryFrame / 400;

    const circuit = circuitTelemetry[state.telemetryCircuit] || circuitTelemetry.monza;
    const profile = circuit.speedProfile;
    const index = Math.floor(normT * (profile.length - 1));
    const nextIndex = Math.min(profile.length - 1, index + 1);
    const subT = (normT * (profile.length - 1)) - index;

    // Interpolate current speed
    const currentSpeed = Math.round(profile[index] + (profile[nextIndex] - profile[index]) * subT);
    const rpm = Math.round(7500 + (currentSpeed / 355) * 7200);
    const gear = currentSpeed < 100 ? 2 : currentSpeed < 150 ? 3 : currentSpeed < 200 ? 4 : currentSpeed < 250 ? 5 : currentSpeed < 300 ? 6 : currentSpeed < 335 ? 7 : 8;
    const throttle = (profile[nextIndex] >= profile[index]) ? Math.min(100, Math.round(40 + subT * 60)) : Math.round(15 * (1 - subT));
    const brake = (profile[nextIndex] < profile[index]) ? Math.min(100, Math.round(85 * (1 - subT))) : 0;
    const drs = currentSpeed > 300 && throttle > 85;
    const gForce = (2.1 + (brake > 0 ? (brake / 100) * 3.1 : (currentSpeed / 355) * 2.8)).toFixed(1);

    // Update UI elements
    const speedEl = document.getElementById('telemetry-speed-val');
    const rpmEl = document.getElementById('telemetry-rpm-val');
    const gearEl = document.getElementById('telemetry-gear-val');
    const throttleBar = document.getElementById('telemetry-throttle-bar');
    const brakeBar = document.getElementById('telemetry-brake-bar');
    const drsBadge = document.getElementById('telemetry-drs-badge');
    const gforceEl = document.getElementById('telemetry-gforce-val');

    if (speedEl) speedEl.textContent = currentSpeed;
    if (rpmEl) rpmEl.textContent = rpm.toLocaleString();
    if (gearEl) gearEl.textContent = gear;
    if (throttleBar) throttleBar.style.width = `${throttle}%`;
    if (brakeBar) brakeBar.style.width = `${brake}%`;
    if (gforceEl) gforceEl.textContent = `${gForce} G`;

    if (drsBadge) {
      if (drs) {
        drsBadge.className = 'px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] border border-emerald-500/40 animate-pulse';
        drsBadge.textContent = 'DRS OPEN';
      } else {
        drsBadge.className = 'px-2 py-0.5 rounded bg-white/[0.05] text-white/40 font-mono text-[10px] border border-white/[0.08]';
        drsBadge.textContent = 'DRS CLOSED';
      }
    }

    // Render Canvas Trace
    renderTelemetryTrace(profile, normT);

    requestAnimationFrame(updateTelemetryLoop);
  }

  requestAnimationFrame(updateTelemetryLoop);
}

function renderTelemetryTrace(profile, progress) {
  if (!telemetryCanvas || !tCtx) return;

  const rect = telemetryCanvas.parentElement.getBoundingClientRect();
  const cw = rect.width;
  const ch = 140;

  tCtx.clearRect(0, 0, cw, ch);

  // Trace background
  tCtx.fillStyle = 'rgba(10, 10, 14, 0.4)';
  tCtx.fillRect(0, 0, cw, ch);

  // Speed curve
  tCtx.beginPath();
  profile.forEach((spd, idx) => {
    const x = (idx / (profile.length - 1)) * cw;
    const y = ch - (spd / 370) * (ch - 20) - 10;
    if (idx === 0) tCtx.moveTo(x, y);
    else tCtx.lineTo(x, y);
  });

  tCtx.strokeStyle = 'rgba(0, 214, 255, 0.4)';
  tCtx.lineWidth = 2;
  tCtx.stroke();

  // Active tracking marker
  const curX = progress * cw;
  tCtx.beginPath();
  tCtx.moveTo(curX, 0);
  tCtx.lineTo(curX, ch);
  tCtx.strokeStyle = 'rgba(225, 6, 0, 0.8)';
  tCtx.lineWidth = 1.5;
  tCtx.stroke();

  tCtx.fillStyle = '#00D6FF';
  tCtx.beginPath();
  tCtx.arc(curX, ch - 20, 4, 0, Math.PI * 2);
  tCtx.fill();
}

// -------------------------------------------------------------
// 6. PROCEDURAL FERRARI V6 HYBRID AUDIO SYNTHESIZER
// -------------------------------------------------------------
class FerrariAudioEngine {
  constructor() {
    this.ctx = null;
    this.osc1 = null;
    this.osc2 = null;
    this.turboOsc = null;
    this.gainMaster = null;
    this.turboGain = null;
    this.isPlaying = false;
    this.currentRPM = 6000;
  }

  init() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();
    this.gainMaster = this.ctx.createGain();
    this.gainMaster.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.gainMaster.connect(this.ctx.destination);

    // Primary V6 Engine Oscillators
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.setValueAtTime(140, this.ctx.currentTime);

    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(280, this.ctx.currentTime);

    // Distortion / Aggressive Exhaust Wave Shaper
    const waveShaper = this.ctx.createWaveShaper();
    waveShaper.curve = this.makeDistortionCurve(18);

    // Lowpass filter for engine body
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(1800, this.ctx.currentTime);

    this.osc1.connect(waveShaper);
    this.osc2.connect(waveShaper);
    waveShaper.connect(this.filter);
    this.filter.connect(this.gainMaster);

    // Turbocharger high-pitch spool whistle
    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.setValueAtTime(2400, this.ctx.currentTime);

    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
    this.turboOsc.connect(this.turboGain);
    this.turboGain.connect(this.gainMaster);

    this.osc1.start();
    this.osc2.start();
    this.turboOsc.start();
    this.isPlaying = true;
  }

  makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  setRPM(rpm) {
    if (!this.ctx || !this.isPlaying) return;
    this.currentRPM = Math.max(3500, Math.min(15000, rpm));
    // V6 firing frequency = (RPM / 60) * 3
    const freq = (this.currentRPM / 60) * 3;
    const now = this.ctx.currentTime;

    this.osc1.frequency.setTargetAtTime(freq, now, 0.05);
    this.osc2.frequency.setTargetAtTime(freq * 1.5, now, 0.05);
    this.turboOsc.frequency.setTargetAtTime(1200 + (this.currentRPM / 15000) * 4500, now, 0.08);
    this.filter.frequency.setTargetAtTime(800 + (this.currentRPM / 15000) * 3500, now, 0.05);
  }

  unmute() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.gainMaster.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.1);
  }

  mute() {
    if (this.gainMaster && this.ctx) {
      this.gainMaster.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.1);
    }
  }

  revBurst() {
    if (!this.ctx) this.init();
    this.unmute();
    const now = this.ctx.currentTime;
    // Rev up to 14,500 RPM then settle
    this.setRPM(14500);
    setTimeout(() => {
      this.setRPM(5500);
      if (state.isAudioMuted) {
        setTimeout(() => this.mute(), 800);
      }
    }, 900);
  }
}

function initAudioEngine() {
  state.audioEngine = new FerrariAudioEngine();

  const toggleBtn = document.getElementById('nav-audio-toggle');
  const soundIcon = document.getElementById('nav-audio-icon');
  const soundLabel = document.getElementById('nav-audio-label');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      state.isAudioMuted = !state.isAudioMuted;
      if (!state.isAudioMuted) {
        state.audioEngine.unmute();
        state.audioEngine.setRPM(8500);
        if (soundLabel) soundLabel.textContent = 'AUDIO: ON';
        if (toggleBtn) toggleBtn.classList.add('border-cyan-400', 'text-cyan-400');
      } else {
        state.audioEngine.mute();
        if (soundLabel) soundLabel.textContent = 'AUDIO: OFF';
        if (toggleBtn) toggleBtn.classList.remove('border-cyan-400', 'text-cyan-400');
      }
    });
  }

  const revBtn = document.getElementById('btn-rev-engine');
  if (revBtn) {
    revBtn.addEventListener('click', () => {
      state.audioEngine.revBurst();
    });
  }

  const heroRevBtn = document.getElementById('hero-rev-btn');
  if (heroRevBtn) {
    heroRevBtn.addEventListener('click', () => {
      if (state.isAudioMuted && toggleBtn) {
        toggleBtn.click();
      }
      state.audioEngine.revBurst();
    });
  }
}

// -------------------------------------------------------------
// 7. APPLE-GRADE MINIMAL NAVBAR & MARANELLO CLOCK
// -------------------------------------------------------------
function initNavbarAndClock() {
  const navbar = document.getElementById('apple-navbar');
  const clockEl = document.getElementById('maranello-clock');

  // Sticky Glass Transition on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('bg-[#050505]/85', 'backdrop-blur-md', 'border-b', 'border-white/[0.08]', 'shadow-2xl');
      navbar.classList.remove('bg-transparent');
    } else {
      navbar.classList.remove('bg-[#050505]/85', 'backdrop-blur-md', 'border-b', 'border-white/[0.08]', 'shadow-2xl');
      navbar.classList.add('bg-transparent');
    }
  });

  // Maranello (CET / UTC+1/UTC+2) Live Clock
  function updateClock() {
    const now = new Date();
    // Maranello timezone: Europe/Rome
    const timeString = now.toLocaleTimeString('en-GB', {
      timeZone: 'Europe/Rome',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    if (clockEl) clockEl.textContent = `MARANELLO, IT: ${timeString} CET`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Mobile menu toggle
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  if (menuBtn && mobileDrawer) {
    menuBtn.addEventListener('click', () => {
      mobileDrawer.classList.toggle('hidden');
    });
  }
}

// -------------------------------------------------------------
// 8. INITIALIZATION ON DOM READY
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initScrollySequence();
  initHotspots();
  initCadExplorer();
  initTelemetryDashboard();
  initAudioEngine();
  initNavbarAndClock();

  // Close modal button
  const modalClose = document.getElementById('hotspot-modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', closeHotspotModal);
  }

  // Keyboard shortcuts (Esc to close, R to rev engine, M to mute/unmute)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeHotspotModal();
    } else if (e.key === 'r' || e.key === 'R') {
      if (state.audioEngine) state.audioEngine.revBurst();
    } else if (e.key === 'm' || e.key === 'M') {
      const toggleBtn = document.getElementById('nav-audio-toggle');
      if (toggleBtn) toggleBtn.click();
    }
  });
});