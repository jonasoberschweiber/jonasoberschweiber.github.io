import * as THREE from '/js/three.js';
import { OrbitControls } from '/js/orbit-controls.js';

class BotLeg {
  constructor(parent, x, y, signX, signY, name, boxGeometry, material) {
    this.assembly = new THREE.Object3D();
    parent.add(this.assembly);

    this.signX = signX;
    this.signY = signY;

    this.brace = new THREE.Mesh(boxGeometry, material);
    this.brace.position.set(x, 0, y);
    this.brace.scale.set(2, 3, 2);
    this.assembly.add(this.brace);

    this.leg = new THREE.Mesh(boxGeometry, material);
    this.leg.position.set(x + 4.5 * signX, 0, y + 4.5 * signY);
    this.leg.scale.set(2, 4, 2);

    this.legPivot = new THREE.Group();
    this.legPivot.add(this.leg);
    this.assembly.add(this.legPivot);

    this.braceRotation = 0.1;
    this.legRotation = 0.1;
  }

  get braceRotation() {
    return this._braceRotation;
  }

  set braceRotation(value) {
    if (value > 0.4) {
      value = 0.4;
    }
    if (value < -0.5) {
      value = -0.5;
    }

    this._braceRotation = value;
    this.assembly.rotation.y = value;
  }

  get legRotation() {
    return this._legRotation;
  }

  set legRotation(value) {
    this._legRotation = value;

    if (value > 1.6) {
      value = 1.6;
    }
    if (value < -1.6) {
      value = -1.6;
    }

    const k = 2;
    const x = k * Math.cos(value);
    const y = k * Math.sin(value);

    this.legPivot.position.y = y;
    this.legPivot.position.x = x * this.signX;
    this.legPivot.position.z = x * this.signY;
  }
}

class Oscillator {
  constructor(amplitude, phase, offset, period, t0) {
    this.amplitude = amplitude;
    this.phase = phase;
    this.offset = offset;
    this.period = period;
    this.t0 = t0;
  }

  valueAt(t) {
    const dt = (t - this.t0) % this.period;
    return this.offset + this.amplitude * Math.sin(this.phase + dt * 2.0 * Math.PI / this.period);
  }
}

class OscillatorView3D {
  constructor(oscillator, zOffset = 5, xScale = 0.01, yScale = 10.0, minMark = null, maxMark = null, activeSide = null, points = 2000) {
    this.oscillator = oscillator;
    this.points = points;

    this.zOffset = zOffset;
    this.xScale = xScale;
    this.yScale = yScale;
    this.activeSide = activeSide;

    const waveMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
    const zeroMaterial = new THREE.LineBasicMaterial({ color: 0x00aaaa });
    const minMaxMaterial = new THREE.LineBasicMaterial({ color: 0xaa0000 });
    const circleMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.DoubleSide });

    this.geometry = new THREE.BufferGeometry();
    this.position = new Float32Array(this.points * 3);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.position, 3));
    this.line = new THREE.Line(this.geometry, waveMaterial);

    const zeroPoints = [
      new THREE.Vector3(0, zOffset, 0),
      new THREE.Vector3(this.points * this.xScale, zOffset, 0)
    ];
    const zeroGeom = new THREE.BufferGeometry().setFromPoints(zeroPoints);
    this.zeroLine = new THREE.Line(zeroGeom, zeroMaterial);

    const circleGeom = new THREE.CircleGeometry(this.yScale * 0.05, 16);
    this.circle = new THREE.Mesh(circleGeom, circleMaterial);
    this.circle.position.set(0, zOffset, 0);
    this.circle.rotation.x = Math.PI / 2.0;

    this.object = new THREE.Object3D();

    if (minMark) {
      const minPoints = [
        new THREE.Vector3(0, zOffset, minMark * this.yScale),
        new THREE.Vector3(this.points * this.xScale, zOffset, minMark * this.yScale)
      ];
      const minGeom = new THREE.BufferGeometry().setFromPoints(minPoints);
      this.minLine = new THREE.Line(minGeom, minMaxMaterial);
      this.object.add(this.minLine);
    }

    if (maxMark) {
      const maxPoints = [
        new THREE.Vector3(0, zOffset, maxMark * this.yScale),
        new THREE.Vector3(this.points * this.xScale, zOffset, maxMark * this.yScale)
      ];
      const maxGeom = new THREE.BufferGeometry().setFromPoints(maxPoints);
      this.maxLine = new THREE.Line(maxGeom, minMaxMaterial);
      this.object.add(this.maxLine);
    }

    this.object.add(this.line);
    this.object.add(this.zeroLine);
    this.object.add(this.circle);
  }

  update(timeMs) {
    let x, y, z, index;
    x = y = z = index = 0;

    for (let i = 0, l = this.points; i < l; i++) {
      this.position[index++] = i * this.xScale;
      this.position[index++] = this.zOffset;

      const t = timeMs + i;
      const side = Math.floor(t / 500.0) % 2;

      if (this.activeSide !== null && this.activeSide != side) {
        this.position[index++] = 0;
      } else {
        this.position[index++] = this.oscillator.valueAt(t) * this.yScale;
      }
    }

    const side = Math.floor(timeMs / 500.0) % 2;
    if (this.activeSide !== null && this.activeSide != side) {
      this.circle.position.set(0, this.zOffset, 0);
    } else {
      this.circle.position.set(0, this.zOffset, this.oscillator.valueAt(timeMs) * this.yScale);
    }
    this.line.geometry.attributes.position.needsUpdate = true;
  }

  add(parent) {
    parent.add(this.object);
  }
}

class OscillatorView2D {
  constructor(oscillator, canvas, activeSide, options = {}) {
    this.oscillator = oscillator;
    this.canvas = canvas;
    this.activeSide = activeSide;
    this.ticks = options.ticks || 1000.0;
    this.maxY = options.maxY || oscillator.amplitude;
    this.displayTicks = options.displayTicks;
    this.options = options;
    this.period = options.period || options.ticks || 1000.0;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const pixelRatio = window.devicePixelRatio;
    const width = this.canvas.clientWidth * pixelRatio || 0;
    const height = this.canvas.clientHeight * pixelRatio || 0;
    const needResize = this.canvas.width !== width || this.canvas.height !== height;
    if (needResize) {
      this.canvas.width = this.canvas.clientWidth * pixelRatio;
      this.canvas.height = this.canvas.clientHeight * pixelRatio;
    }
    return needResize;
  }

  update(timeMs) {
    const canvas = this.canvas;
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const maxY = this.maxY;
    const yPadding = 20;
    const xLabelWidth = 20;
    const yScale = ((height - yPadding) / 2.0) / maxY;


    const oscY = (t) => height / 2.0 + this.oscillator.valueAt(t) * yScale * -1;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Zero line
    ctx.strokeStyle = '#0000ff';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([5, 15]);
    ctx.beginPath()
    ctx.moveTo(xLabelWidth, height / 2.0);
    ctx.lineTo(width, height / 2.0);
    ctx.stroke();

    // Max line
    ctx.beginPath();
    ctx.moveTo(xLabelWidth, height / 2.0 - maxY * yScale);
    ctx.lineTo(width, height / 2.0 - maxY * yScale);
    ctx.stroke();

    // Min line
    ctx.beginPath();
    ctx.moveTo(xLabelWidth, height / 2.0 + maxY * yScale);
    ctx.lineTo(width, height / 2.0 + maxY * yScale);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', 0, height / 2.0);
    ctx.fillText(maxY.toString(), 0, height / 2.0 - maxY * yScale);
    ctx.fillText((maxY * - 1).toString(), 0, height / 2.0 + maxY * yScale);

    // Ticks
    if (this.displayTicks) {
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('0 ticks', 0, height);
      ctx.fillText(`${this.ticks} ticks`, width - 50, height);
    }

    if (this.options && this.options.spacedXLabels) {
      const spacedXLabels = this.options.spacedXLabels;
      // Display these labels along the x axis in evenly spaced intervals.
      const interval = (width - xLabelWidth) / (spacedXLabels.length - 1);
      ctx.textBaseline = 'alphabetic';
      for (let i = 0; i < spacedXLabels.length; i++) {
        let x = xLabelWidth + i * interval;
        ctx.fillText(spacedXLabels[i], x, height - 5);
      }
    }

    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(xLabelWidth, oscY(timeMs));
    for (let i = 0; i < this.ticks; i++) {
      const x = xLabelWidth + (width - xLabelWidth) / this.ticks * i;
      const t = timeMs + i;

      let y = oscY(t);
      const side = Math.floor(t / (this.period / 2.0)) % 2;
      if (this.activeSide !== null && this.activeSide !== side) {
        y = height / 2.0;
      }

      ctx.lineTo(x, y);
    }
    ctx.stroke();

    const side = Math.floor(timeMs / (this.period / 2.0)) % 2;
    if (this.activeSide === null || this.activeSide === side) {
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(xLabelWidth, oscY(timeMs), 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

function resizeRendererToDisplay(renderer) {
  const canvas = renderer.domElement;
  const pixelRatio = window.devicePixelRatio;
  const width = canvas.clientWidth * pixelRatio | 0;
  const height = canvas.clientHeight * pixelRatio | 0;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

function setup3DView() {
  // Setup scene.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaaaaaa);

  const canvas = document.querySelector('#scene');
  const renderer = new THREE.WebGLRenderer({ canvas });

  const boxGeometry = new THREE.BoxBufferGeometry(2, 2, 2);

  const bot = new THREE.Object3D();
  bot.position.set(0, 0, 0);
  scene.add(bot);

  const botMaterial = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0x0,
    roughness: 0.4
  });
  const botBody = new THREE.Mesh(boxGeometry, botMaterial);
  botBody.position.set(0, 0, 0);
  botBody.scale.set(5, 2, 5);
  bot.add(botBody);

  const legs = {
    frontLeft: new BotLeg(bot, 4.5, -4.5, 1, -1, 'back left', boxGeometry, botMaterial),
    frontRight: new BotLeg(bot, 4.5, 4.5, 1, 1, 'front left', boxGeometry, botMaterial),
    backLeft: new BotLeg(bot, -4.5, -4.5, -1, -1, 'back right', boxGeometry, botMaterial),
    backRight: new BotLeg(bot, -4.5, 4.5, -1, 1, 'front right', boxGeometry, botMaterial),
  };

  const ambientLight = new THREE.AmbientLight(0xffffff, .8);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(50, 50, 50);
  dirLight.target.position.set(0, 0, 0);
  scene.add(dirLight);
  scene.add(dirLight.target);

  const camera = new THREE.PerspectiveCamera(40, 2, 0.1, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  camera.position.set(-50, 45, 35);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);
  controls.update();

  const braceAmpl = 0.3;
  const legAmpl = 0.5;
  const phase = 1000.0;
  const phase2 = phase / 2.0;
  const deg90 = Math.PI / 2.0;
  const deg270 = Math.PI * 1.5;
  const oscillators = {
    frontLeft: {
      brace: new Oscillator(braceAmpl, deg270, 0, phase, 0),
      leg: new Oscillator(legAmpl, deg90, 0.1, phase2, 0),
    },
    frontRight: {
      brace: new Oscillator(braceAmpl, deg270, 0, phase, 0),
      leg: new Oscillator(legAmpl, deg90, 0.1, phase2, 0),
    },
    backLeft: {
      brace: new Oscillator(braceAmpl, deg90, 0, phase, 0),
      leg: new Oscillator(legAmpl, deg90, 0.1, phase2, 0),
    },
    backRight: {
      brace: new Oscillator(braceAmpl, deg90, 0, phase, 0),
      leg: new Oscillator(legAmpl, deg90, 0.1, phase2, 0),
    }
  };

  function addOscillatorView(oscillator, min, max, rotX, rotY, x, y, z, activeSide) {
    const view = new OscillatorView3D(
      oscillator,
      5,
      0.002,
      5.0,
      min,
      max,
      activeSide
    );
    view.add(scene);
    view.object.rotation.y = rotY;
    view.object.rotation.x = rotX;
    view.object.position.set(x, y, z);
    return view;
  }

  const oscillatorViews3D = {
    frontRight: {
      brace: addOscillatorView(oscillators.frontRight.brace, -0.5, 0.4, 0, deg90, 4.5, 0, 4.5, null),
      leg: addOscillatorView(oscillators.frontRight.leg, -1.6, 1.6, deg90, deg90, 14.5, 0, 7.5, 1),
    },
    backRight: {
      brace: addOscillatorView(oscillators.backRight.brace, -0.5, 0.4, 0, deg90, -4.5, 0, 4.5, null),
      leg: addOscillatorView(oscillators.backRight.leg, -1.6, 1.6, deg90, deg90, -14.5, 0, 7.5, 0),
    },
    frontLeft: {
      brace: addOscillatorView(oscillators.frontLeft.brace, -0.5, 0.4, 0, deg90, 4.5, 0, -4.5, null),
      leg: addOscillatorView(oscillators.frontLeft.leg, -1.6, 1.6, deg90, deg90, 14.5, 0, -14.5, 0),
    },
    backLeft: {
      brace: addOscillatorView(oscillators.backLeft.brace, -0.5, 0.4, 0, deg90, -4.5, 0, -4.5, null),
      leg: addOscillatorView(oscillators.backLeft.leg, -1.6, 1.6, deg90, deg90, -14.5, 0, -14.5, 1),
    }
  };

  const groundGeometry = new THREE.PlaneGeometry(50, 50);
  const groundMaterial = new THREE.MeshPhongMaterial({
    color: 0x5fa5fa,
    side: THREE.DoubleSide
  });
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.position.set(0, -5, 0);
  groundMesh.rotation.set(Math.PI * -.5, 0, 0);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const direction = new THREE.Vector3(1, 0, 0);
  direction.normalize();
  const origin = new THREE.Vector3(10, 0, 0);
  const arrowHelper = new THREE.ArrowHelper(
    direction,
    origin,
    10, 0x4438ca
  );
  scene.add(arrowHelper);

  const dqs = (id) => document.querySelector(id);

  const oscillatorViews2D = {
    frontLeft: {
      brace: new OscillatorView2D(oscillators.frontLeft.brace, dqs('#graph-fl-brace'), null),
      leg: new OscillatorView2D(oscillators.frontLeft.leg, dqs('#graph-fl-leg'), 0),
    },
    frontRight: {
      brace: new OscillatorView2D(oscillators.frontRight.brace, dqs('#graph-fr-brace'), null),
      leg: new OscillatorView2D(oscillators.frontRight.leg, dqs('#graph-fr-leg'), 1),
    },
    backLeft: {
      brace: new OscillatorView2D(oscillators.backLeft.brace, dqs('#graph-bl-brace'), null),
      leg: new OscillatorView2D(oscillators.backLeft.leg, dqs('#graph-bl-leg'), 1),
    },
    backRight: {
      brace: new OscillatorView2D(oscillators.backRight.brace, dqs('#graph-br-brace'), null),
      leg: new OscillatorView2D(oscillators.backRight.leg, dqs('#graph-br-leg'), 0),
    }
  };

  return {
    scene,
    renderer,
    camera,
    legs,
    controls,
    oscillators,
    oscillatorViews3D,
    oscillatorViews2D
  };
}

function animate3DView(timeMs, scene) {
  const {
    renderer,
    legs,
    oscillators,
    oscillatorViews2D,
    oscillatorViews3D
  } = scene;

  if (resizeRendererToDisplay(renderer)) {
    const canvas = renderer.domElement;
    scene.camera.aspect = canvas.clientWidth / canvas.clientHeight;
    scene.camera.updateProjectionMatrix();
  }

  oscillatorViews2D.frontLeft.brace.update(timeMs);
  oscillatorViews2D.frontLeft.leg.update(timeMs);
  oscillatorViews2D.frontRight.brace.update(timeMs);
  oscillatorViews2D.frontRight.leg.update(timeMs);
  oscillatorViews2D.backLeft.brace.update(timeMs);
  oscillatorViews2D.backLeft.leg.update(timeMs);
  oscillatorViews2D.backRight.brace.update(timeMs);
  oscillatorViews2D.backRight.leg.update(timeMs);

  oscillatorViews3D.frontLeft.brace.update(timeMs);
  oscillatorViews3D.frontLeft.leg.update(timeMs);
  oscillatorViews3D.frontRight.brace.update(timeMs);
  oscillatorViews3D.frontRight.leg.update(timeMs);
  oscillatorViews3D.backLeft.brace.update(timeMs);
  oscillatorViews3D.backLeft.leg.update(timeMs);
  oscillatorViews3D.backRight.brace.update(timeMs);
  oscillatorViews3D.backRight.leg.update(timeMs);

  legs.frontLeft.braceRotation = oscillators.frontLeft.brace.valueAt(timeMs);
  legs.frontRight.braceRotation = oscillators.frontRight.brace.valueAt(timeMs);
  legs.backLeft.braceRotation = oscillators.backLeft.brace.valueAt(timeMs);
  legs.backRight.braceRotation = oscillators.backRight.brace.valueAt(timeMs);

  const side = Math.floor(timeMs / 500) % 2 == 0;
  if (side) {
    legs.frontLeft.legRotation = oscillators.frontLeft.leg.valueAt(timeMs);
    legs.backRight.legRotation = oscillators.backRight.leg.valueAt(timeMs);
  } else {
    legs.frontRight.legRotation = oscillators.frontRight.leg.valueAt(timeMs);
    legs.backLeft.legRotation = oscillators.backLeft.leg.valueAt(timeMs);
  }

  scene.controls.update();
  renderer.render(scene.scene, scene.camera);

  requestAnimationFrame((t) => animate3DView(t, scene));
}

// A helper to keep the virtual size of the canvas -- the one that you use to
// draw on it -- in sync with its actual size on the page, taking into account
// the current device's pixel ratio. Call this once on initialization and then
// whenever the window's resize event fires.
function scaleCanvas(canvas) {
  const pixelRatio = window.devicePixelRatio;
  const width = canvas.clientWidth * pixelRatio || 0;
  const height = canvas.clientHeight * pixelRatio || 0;
  const needResize = Math.abs(canvas.width - width) > 1 || Math.abs(canvas.height - height) > 1;
  if (needResize) {
    canvas.width = canvas.clientWidth * pixelRatio;
    canvas.height = canvas.clientHeight * pixelRatio;
  }
}

// Generates scaling functions that let you draw on a canvas in some virtual
// size that you set up front. Does not currently take aspect ratios into
// account.
// Returns a four-element list with target width, target height, an x scaling
// function and a y scaling function.
function canvasResizer(canvas, targetWidth, targetHeight) {
  const xRatio = canvas.clientWidth / targetWidth;
  const yRatio = canvas.clientHeight / targetHeight;
  const rX = x => x * xRatio;
  const rY = y => y * yRatio;
  return [
    targetWidth,
    targetHeight,
    rX,
    rY
  ];
}

// Controller for a simple, tweakable sine wave.
class SineController extends Stimulus.Controller {
  static get targets() {
    return [
      "canvas",
      "amplitude",
      "phase",
      "offset",
      "period",
      "periodDisplay",
      "amplitudeDisplay",
      "phaseDisplay",
      "offsetDisplay"
    ];
  }
  static get values() {
    return {
      amplitude: Number,
      phase: Number,
      offset: Number,
      period: Number,
      ticks: Number,
      displayTicks: Boolean,
      xLabels: String
    };
  }
  initialize() {
    this.oscillator = new Oscillator(1.0, 0.0, 0.0, 1000, 0);
  }
  connect() {
    if (this.hasAmplitudeValue) {
      this.oscillator.amplitude = this.amplitudeValue;
    }
    if (this.hasPeriodValue) {
      this.oscillator.period = this.periodValue;
    }
    let ticks = 2000.0;
    if (this.hasTicksValue) {
      ticks = this.ticksValue;
    }
    let xLabels = null;
    if (this.hasXLabelsValue) {
      xLabels = this.xLabelsValue.split(' ');
    }
    let displayTicks = true;
    if (this.hasDisplayTicksValue) {
      displayTicks = this.displayTicksValue;
    }
    this.view = new OscillatorView2D(
      this.oscillator,
      this.canvasTarget,
      null,
      {
        ticks: ticks,
        maxY: 2,
        displayTicks: displayTicks,
        spacedXLabels: xLabels
      }
    );
    this.draw();
    if (this.hasAmplitudeTarget) {
      this.amplitudeTarget.value = this.oscillator.amplitude;
    }
    if (this.hasPhaseTarget) {
      this.phaseTarget.value = this.oscillator.phase;
    }
    if (this.hasOffsetTarget) {
      this.offsetTarget.value = this.oscillator.offset;
    }
    if (this.hasPeriodTarget) {
      this.periodTarget.value = this.oscillator.period;
    }
    window.addEventListener('resize', () => this.draw());
  }
  disconnect() {
    this.view = null;
  }
  draw() {
    if (this.hasPeriodDisplayTarget) {
      this.periodDisplayTarget.value = this.oscillator.period;
    }
    if (this.hasAmplitudeDisplayTarget) {
      this.amplitudeDisplayTarget.value = this.oscillator.amplitude;
    }
    if (this.hasPhaseDisplayTarget) {
      this.phaseDisplayTarget.value = this.renderPhase();
    }
    if (this.hasOffsetDisplayTarget) {
      this.offsetDisplayTarget.value = this.oscillator.offset;
    }
    this.view.update(0);
  }
  renderPhase() {
    const degrees = Math.trunc(this.oscillator.phase * 180.0 / Math.PI);
    const overPi = this.oscillator.phase / Math.PI;
    const digits = overPi - Math.floor(overPi);
    let closestPiFraction = '';
    if (digits >= 0 && digits <= 0.05) {
      closestPiFraction = ' / ~' + Math.floor(overPi) + 'π';
    }
    if (digits >= 0.48 && digits <= 0.52) {
      closestPiFraction = ' / ~' + (Math.floor(overPi) + 0.5) + 'π';
    }
    return `${this.oscillator.phase.toString()} rad / ${degrees} deg` + closestPiFraction;
  }
  changeAmplitude() {
    this.oscillator.amplitude = parseFloat(this.amplitudeTarget.value);
    this.draw();
  }
  changePhase() {
    this.oscillator.phase = parseFloat(this.phaseTarget.value);
    this.draw();
  }
  changeOffset() {
    this.oscillator.offset = parseFloat(this.offsetTarget.value);
    this.draw();
  }
  changePeriod() {
    this.oscillator.period = parseFloat(this.periodTarget.value);
    this.draw();
  }
}

// Controller for a single, animated brace and a corresponding sine wave.
class SingleBraceController extends Stimulus.Controller {
  static get targets() {
    return [
      "braceCanvas",
      "waveCanvas",
      "amplitude",
      "offset",
      "period",
      "phase",
      "amplitudeDisplay",
      "offsetDisplay",
      "periodDisplay",
      "phaseDisplay"
    ];
  }
  initialize() {
    this.oscillator = new Oscillator(1.0, 0.0, 0.4, 1000.0, 0.0);
  }
  connect() {
    this.view = new OscillatorView2D(
      this.oscillator,
      this.waveCanvasTarget,
      null,
      {
        ticks: 2000.0,
        maxY: 2,
        displayTicks: true,
      }
    );
    scaleCanvas(this.braceCanvasTarget);
    const animate = (timeMs) => {
      this.view.update(timeMs);
      this.drawBrace(timeMs);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    this.updateDisplays();
    window.addEventListener('resize', () => scaleCanvas(this.braceCanvasTarget));
  }
  updateDisplays() {
    if (this.hasPeriodDisplayTarget) {
      this.periodDisplayTarget.value = this.oscillator.period;
    }
    if (this.hasAmplitudeDisplayTarget) {
      this.amplitudeDisplayTarget.value = this.oscillator.amplitude;
    }
    if (this.hasPhaseDisplayTarget) {
      this.phaseDisplayTarget.value = this.oscillator.phase;
    }
    if (this.hasOffsetDisplayTarget) {
      this.offsetDisplayTarget.value = this.oscillator.offset;
    }
  }
  drawBrace(timeMs) {
    const canvas = this.braceCanvasTarget;
    const [targetWidth, targetHeight, rX, rY] = canvasResizer(canvas, 354, 144);
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rX(targetWidth), rY(targetHeight));
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(rX(1), rY(1), rX(118), rY(78));
    ctx.strokeStyle = 'rgb(120, 53, 15)';
    ctx.strokeRect(0, 0, rX(120), rY(80));
    ctx.fillStyle = 'gray';
    ctx.translate(rX(120), rY(80));
    ctx.rotate(this.oscillator.valueAt(timeMs));
    ctx.translate(rX(-120), rY(-80));
    ctx.fillRect(rX(95), rY(80 - 30), rX(60), rY(60));
    ctx.fillRect(rX(120), rY(95 - 30), rX(65), rY(30));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  changeAmplitude() {
    this.oscillator.amplitude = parseFloat(this.amplitudeTarget.value);
    this.updateDisplays();
  }
  changePhase() {
    this.oscillator.phase = parseFloat(this.phaseTarget.value);
    this.updateDisplays();
  }
  changeOffset() {
    this.oscillator.offset = parseFloat(this.offsetTarget.value);
    this.updateDisplays();
  }
  changePeriod() {
    this.oscillator.period = parseFloat(this.periodTarget.value);
    this.updateDisplays();
  }
}

// Controller for four animated braces with a tweakable phase shift on front
// left/back right and front right/back left.
class FourBracesController extends Stimulus.Controller {
  static get targets() {
    return [
      "braceCanvas",
      "phaseBLFR",
      "phaseBLFRDisplay",
      "phaseBRFL",
      "phaseBRFLDisplay",
      "waveBLFRCanvas",
      "waveBRFLCanvas"
    ];
  }
  initialize() {
    this.oscillator_br = new Oscillator(0.8, Math.PI / 2.0, 0.4, 1000.0, 0.0);
    this.oscillator_fl = new Oscillator(0.8, Math.PI / 2.0, -0.1, 1000.0, 0.0);
    this.oscillator_bl = new Oscillator(0.8, Math.PI * 1.5, 0.4, 1000.0, 0.0);
    this.oscillator_fr = new Oscillator(0.8, Math.PI * 1.5, -0.1, 1000.0, 0.0);
  }
  connect() {
    if (this.hasPhaseBRFLTarget) {
      this.phaseBRFLTarget.value = this.oscillator_br.phase;
    }
    if (this.hasPhaseBLFRTarget) {
      this.phaseBLFRTarget.value = this.oscillator_bl.phase;
    }

    this.brflView = new OscillatorView2D(
      this.oscillator_br,
      this.waveBRFLCanvasTarget,
      null,
      {
        ticks: 2000.0,
        maxY: 2,
        displayTicks: true,
      }
    );
    this.blfrView = new OscillatorView2D(
      this.oscillator_bl,
      this.waveBLFRCanvasTarget,
      null,
      {
        ticks: 2000.0,
        maxY: 2,
        displayTicks: true,
      }
    );

    scaleCanvas(this.braceCanvasTarget);
    this.drawBraces(0);
    const animate = (timeMs) => {
      this.brflView.update(timeMs);
      this.blfrView.update(timeMs);
      this.drawBraces(timeMs);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    this.updateDisplays();
    window.addEventListener('resize', () => scaleCanvas(this.braceCanvasTarget));
  }
  updateDisplays() {
    if (this.hasPhaseBLFRDisplayTarget) {
      this.phaseBLFRDisplayTarget.value = this.renderPhase(this.oscillator_bl.phase);
    }
    if (this.hasPhaseBRFLDisplayTarget) {
      this.phaseBRFLDisplayTarget.value = this.renderPhase(this.oscillator_br.phase);
    }
  }
  renderPhase(phase) {
    const degrees = Math.trunc(phase * 180.0 / Math.PI);
    const overPi = phase / Math.PI;
    const digits = overPi - Math.floor(overPi);
    let closestPiFraction = '';
    if (digits >= 0 && digits <= 0.05) {
      closestPiFraction = ' / ~' + Math.floor(overPi) + 'π';
    }
    if (digits >= 0.48 && digits <= 0.52) {
      closestPiFraction = ' / ~' + (Math.floor(overPi) + 0.5) + 'π';
    }
    return `${phase.toFixed(3).toString()} rad / ${degrees} deg` + closestPiFraction;
  }
  drawBraces(timeMs) {
    const canvas = this.braceCanvasTarget;
    const [targetWidth, targetHeight, rX, rY] = canvasResizer(canvas, 288, 144);
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rX(targetWidth), rY(targetHeight));
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(rX(40), rY(40), rX(108), rY(68));
    ctx.strokeStyle = 'rgb(120, 53, 15)';
    ctx.strokeRect(rX(39), rY(39), rX(110), rY(70));
    ctx.fillStyle = 'rgb(16, 185, 129)';
    // br
    ctx.translate(rX(150), rY(110));
    ctx.rotate(this.oscillator_br.valueAt(timeMs));
    ctx.translate(rX(-150), rY(-110));
    ctx.fillRect(rX(120 + 15), rY(110 - 15), rX(30), rY(30));
    ctx.fillRect(rX(120 + 15 + 10), rY(110 - 7.5), rX(35), rY(15));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    // fl
    ctx.translate(rX(40), rY(40));
    ctx.rotate(-this.oscillator_fl.valueAt(timeMs));
    ctx.translate(rX(-40), rY(-40));
    ctx.fillRect(rX(40 - 15), rY(40 - 15), rX(30), rY(30));
    ctx.fillRect(rX(40 - 15 - 15), rY(40 - 7.5), rX(35), rY(15));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    // fr
    ctx.fillStyle = 'rgb(59, 130, 246)';
    ctx.translate(rX(150), rY(40));
    ctx.rotate(this.oscillator_fr.valueAt(timeMs));
    ctx.translate(rX(-150), rY(-40));
    ctx.fillRect(rX(120 + 15), rY(40 - 15), rX(30), rY(30));
    ctx.fillRect(rX(120 + 15 + 10), rY(40 - 7.5), rX(35), rY(15));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    // bl
    ctx.translate(rX(40), rY(110));
    ctx.rotate(-this.oscillator_bl.valueAt(timeMs));
    ctx.translate(rX(-40), rY(-110));
    ctx.fillRect(rX(40 - 15), rY(110 - 15), rX(30), rY(30));
    ctx.fillRect(rX(40 - 15 - 15), rY(110 - 7.5), rX(35), rY(15));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  changePhaseBLFR() {
    this.oscillator_bl.phase = parseFloat(this.phaseBLFRTarget.value);
    this.oscillator_fr.phase = parseFloat(this.phaseBLFRTarget.value);
    this.updateDisplays();
  }
  changePhaseBRFL() {
    this.oscillator_br.phase = parseFloat(this.phaseBRFLTarget.value);
    this.oscillator_fl.phase = parseFloat(this.phaseBRFLTarget.value);
    this.updateDisplays();
  }
}

// Controller for a foot and brace view with wave display and tweakable time.
class FootAndBraceController extends Stimulus.Controller {
  static get targets() {
    return [
      "braceCanvas",
      "footCanvas",
      "braceWaveCanvas",
      "footWaveCanvas",
      "time",
      "timeDisplay",
      "activeSide"
    ];
  }
  initialize() {
    this.braceOscillator = new Oscillator(1.0, Math.PI / 2.0, 0.4, 1000.0, 0.0);
    this.footOscillator = new Oscillator(10, Math.PI / 2.0, 10, 500.0, 0.0);
    this.activeSide = null;
  }
  connect() {
    this.braceView = new OscillatorView2D(
      this.braceOscillator,
      this.braceWaveCanvasTarget,
      null,
      {
        ticks: 3000.0,
        maxY: 2,
        displayTicks: true,
      }
    );
    this.footView = new OscillatorView2D(
      this.footOscillator,
      this.footWaveCanvasTarget,
      this.activeSide,
      {
        ticks: 3000.0,
        period: 1000.0,
        maxY: 20,
        displayTicks: true,
      }
    );
    scaleCanvas(this.braceCanvasTarget);
    scaleCanvas(this.footCanvasTarget);
    this.timeTarget.value = 0;
    this.activeSideTarget.checked = this.activeSide === 0;
    window.addEventListener('resize', () => {
      scaleCanvas(this.braceCanvasTarget);
      scaleCanvas(this.footCanvasTarget);
      this.draw(parseInt(this.timeTarget.value));
    });
    this.draw(0)
  }
  changeTime() {
    this.draw(parseInt(this.timeTarget.value));
  }
  toggleActiveSide() {
    this.activeSide = this.activeSideTarget.checked ? 0 : null;
    this.footView.activeSide = this.activeSide;
    this.draw(parseInt(this.timeTarget.value));
  }
  draw(timeMs) {
    this.drawBrace(timeMs);
    this.braceView.update(timeMs);
    this.footView.update(timeMs);
    const side = Math.floor(timeMs / (1000.0 / 2.0)) % 2;
    if (this.activeSide === null || this.activeSide === side) {
      this.drawFoot(timeMs);
    }
    if (this.hasTimeDisplayTarget) {
      this.timeDisplayTarget.value = timeMs;
    }
    this.activeSideTarget.checked = this.activeSide === 0;
  }
  drawBrace(timeMs) {
    const canvas = this.braceCanvasTarget;
    const [targetWidth, targetHeight, rX, rY] = canvasResizer(canvas, 350, 160);
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rX(canvas.width), rY(canvas.height));
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(rX(1), rY(1), rX(118), rY(78));
    ctx.strokeStyle = 'rgb(120, 53, 15)';
    ctx.strokeRect(0, 0, rX(120), rY(80));
    ctx.fillStyle = 'gray';
    ctx.translate(rX(120), rY(80));
    ctx.rotate(this.braceOscillator.valueAt(timeMs));
    ctx.translate(rX(-120), rY(-80));
    ctx.fillRect(rX(95), rY(80 - 30), rX(60), rY(60));
    ctx.fillRect(rX(120), rY(95 - 30), rX(65), rY(30));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  drawFoot(timeMs) {
    const canvas = this.footCanvasTarget;
    const [targetWidth, targetHeight, rX, rY] = canvasResizer(canvas, 350, 160);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rX(targetWidth), rY(targetHeight));
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(rX(1), rY(31), rX(118), rY(38));
    ctx.strokeStyle = 'rgb(120, 53, 15)';
    ctx.strokeRect(0, rY(30), rX(120), rY(40));
    ctx.fillStyle = 'gray';
    // brace
    ctx.fillRect(rX(100), rY(20), rX(50), rY(10));
    ctx.fillRect(rX(130), rY(20), rX(30), rY(60));
    ctx.fillRect(rX(100), rY(70), rX(50), rY(10));
    // foot
    ctx.fillStyle = 'red';
    ctx.fillRect(rX(180), rY(30 - this.footOscillator.valueAt(timeMs)), rX(30), rY(80));
  }
}

function setupStimulusControllers() {
  const application = Stimulus.Application.start();
  application.register("sine", SineController);
  application.register("single-brace", SingleBraceController);
  application.register("four-braces", FourBracesController);
  application.register("foot-and-brace", FootAndBraceController);
}

export {
  setup3DView,
  animate3DView,
  setupStimulusControllers,
  Oscillator,
  OscillatorView2D
};