// ═══════════════════════════════════════════════════════════
// Wingy Netball — Game Logic
// Designed by a brilliant 8-year-old. Built with love.
// ═══════════════════════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── Screens ──
const menuScreen = document.getElementById('menuScreen');
const nameScreen = document.getElementById('nameScreen');
const endScreen = document.getElementById('endScreen');
const compareScreen = document.getElementById('compareScreen');
const player2Group = document.getElementById('player2Group');

// ── Canvas sizing ──
let W, H, dpr;

function resizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ── Constants ──
const BALL_RADIUS = 14;
const LAUNCH_SPEED_MIN = 7;
const LAUNCH_SPEED_MAX = 18;
const CHARGE_TIME = 60; // frames to reach full power
const GRAVITY = 0.35;
const WALL_BOUNCE = -0.6;
const MAX_PARTICLES = 200;
const BALLS_PER_ROUND = 10;
const NET_RING_WIDTH = 80;
const NET_RING_HEIGHT = 12;
const NET_MESH_DEPTH = 40;
const NET_POST_HEIGHT = 60;

// ── Game State ──
const state = {
  phase: 'MENU',
  mode: 1,
  players: [
    { name: '', goals: 0, shots: 0, best: 0 },
    { name: '', goals: 0, shots: 0, best: 0 }
  ],
  currentPlayer: 0,
  ballsRemaining: BALLS_PER_ROUND,
  ball: null,
  nets: [],
  particles: [],
  bgStars: [],
  frameCount: 0,
  speedMul: 1.0,
  spawnInterval: 90,
  screenFlash: 0,
  scorePop: 0,
  canShoot: true,
  endDelay: 0,
  ballBounceIdx: -1,
  ballBounceTimer: 0,
  charging: false,
  chargeFrames: 0,
  aimPos: null
};

// ── Background Stars ──
function initStars() {
  state.bgStars = [];
  for (let i = 0; i < 80; i++) {
    state.bgStars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.5,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.01 + Math.random() * 0.03,
      color: ['#fff', '#ffccff', '#cc88ff', '#87CEEB'][Math.floor(Math.random() * 4)]
    });
  }
}
initStars();

// ── localStorage helpers ──
function loadBest(name) {
  try {
    return parseInt(localStorage.getItem('wingyNetball_best_' + name)) || 0;
  } catch { return 0; }
}

function saveBest(name, score) {
  try {
    localStorage.setItem('wingyNetball_best_' + name, score);
  } catch {}
}

// ═══════════════════════════════════════
// CLASSES
// ═══════════════════════════════════════

class Ball {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.active = false;
    this.wingPhase = Math.random() * Math.PI * 2;
    this.wingAmplitude = 0.3;
    this.rotation = 0;
    this.trail = [];
  }

  launch(targetX, targetY, speed) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
    this.active = true;
    this.wingAmplitude = 0.8;
    playShoot();
  }

  update() {
    if (!this.active) {
      this.wingPhase += 0.12;
      return;
    }

    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.vx * 0.03;
    this.wingPhase += 0.25;

    // Wall bounce
    if (this.x - BALL_RADIUS < 0) {
      this.x = BALL_RADIUS;
      this.vx *= WALL_BOUNCE;
    } else if (this.x + BALL_RADIUS > W) {
      this.x = W - BALL_RADIUS;
      this.vx *= WALL_BOUNCE;
    }

    // Trail
    if (state.particles.length < MAX_PARTICLES) {
      this.trail.push({ x: this.x, y: this.y, alpha: 0.8, size: 3 + Math.random() * 3 });
    }

    // Off screen
    if (this.y - BALL_RADIUS > H || this.y + BALL_RADIUS < -100) {
      this.active = false;
      playMiss();
      return 'miss';
    }
    return null;
  }

  draw() {
    // Trail
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const t = this.trail[i];
      t.alpha -= 0.04;
      if (t.alpha <= 0) {
        this.trail.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = t.alpha * 0.6;
      ctx.fillStyle = '#ff88dd';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size * t.alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.active ? this.rotation : 0);

    // Wings
    const wingAngle = Math.sin(this.wingPhase) * this.wingAmplitude;
    this.drawWing(-1, wingAngle);
    this.drawWing(1, wingAngle);

    // Ball body — pink radial gradient
    const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, BALL_RADIUS);
    grad.addColorStop(0, '#ffaadd');
    grad.addColorStop(0.6, '#ff44cc');
    grad.addColorStop(1, '#cc2299');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Shimmer highlight
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4, -5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  drawWing(side, angle) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.rotate(angle * side);

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#dd88ff';
    ctx.beginPath();
    ctx.moveTo(BALL_RADIUS - 2, -2);
    ctx.quadraticCurveTo(BALL_RADIUS + 14, -16, BALL_RADIUS + 22, -4);
    ctx.quadraticCurveTo(BALL_RADIUS + 14, 2, BALL_RADIUS - 2, 2);
    ctx.fill();

    // Feather lines
    ctx.strokeStyle = '#cc66ee';
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 3; i++) {
      const t = 0.3 + i * 0.25;
      ctx.beginPath();
      ctx.moveTo(BALL_RADIUS + 2 + i * 5, -1);
      ctx.lineTo(BALL_RADIUS + 8 + i * 4, -10 + i * 3);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

class Net {
  constructor(x) {
    this.x = x;
    this.y = -NET_POST_HEIGHT;
    this.scored = false;
    this.flashTimer = 0;
    this.swayPhase = Math.random() * Math.PI * 2;
  }

  update() {
    this.y += 1.2 * state.speedMul;
    this.swayPhase += 0.02;
    this.x += Math.sin(this.swayPhase) * 0.4;

    if (this.flashTimer > 0) this.flashTimer--;

    return this.y > H + NET_MESH_DEPTH + 20;
  }

  getRingRect() {
    return {
      left: this.x - NET_RING_WIDTH / 2 + 8,
      right: this.x + NET_RING_WIDTH / 2 - 8,
      top: this.y,
      bottom: this.y + NET_RING_HEIGHT
    };
  }

  draw() {
    const isFlash = this.flashTimer > 0;
    const ringColor = isFlash ? '#ffee44' : '#ff44cc';
    const postColor = isFlash ? '#ffee88' : '#cc88ff';
    const glowAlpha = isFlash ? 0.4 : 0;

    // Glow
    if (isFlash) {
      ctx.globalAlpha = glowAlpha * (this.flashTimer / 20);
      ctx.fillStyle = '#ffee44';
      ctx.beginPath();
      ctx.arc(this.x, this.y + 6, NET_RING_WIDTH * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Post
    ctx.strokeStyle = postColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - NET_POST_HEIGHT + 20);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    // Ring (ellipse)
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 6, NET_RING_WIDTH / 2, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Fill ring slightly
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = ringColor;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 6, NET_RING_WIDTH / 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Mesh net
    ctx.strokeStyle = isFlash ? 'rgba(255,238,68,0.5)' : 'rgba(255,200,255,0.3)';
    ctx.lineWidth = 1.5;
    const meshLines = 7;
    for (let i = 0; i < meshLines; i++) {
      const t = i / (meshLines - 1);
      const topX = this.x - NET_RING_WIDTH / 2 + t * NET_RING_WIDTH;
      const bottomX = this.x - 12 + t * 24;
      ctx.beginPath();
      ctx.moveTo(topX, this.y + 12);
      ctx.lineTo(bottomX, this.y + 12 + NET_MESH_DEPTH);
      ctx.stroke();
    }

    // Horizontal mesh lines
    for (let row = 1; row <= 3; row++) {
      const t = row / 4;
      const rowY = this.y + 12 + t * NET_MESH_DEPTH;
      const halfW = (NET_RING_WIDTH / 2) * (1 - t * 0.7);
      ctx.beginPath();
      ctx.moveTo(this.x - halfW, rowY);
      ctx.lineTo(this.x + halfW, rowY);
      ctx.stroke();
    }
  }
}

class Particle {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8 - 3;
    this.gravity = 0.15;
    this.alpha = 1;
    this.decay = 0.018 + Math.random() * 0.02;
    this.size = 3 + Math.random() * 6;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.2;
    this.color = type === 'confetti'
      ? ['#FF69B4', '#FFD700', '#BA55D3', '#FFF', '#87CEEB', '#ff44cc', '#ffccff'][Math.floor(Math.random() * 7)]
      : '#ffccff';
    this.shape = Math.random() > 0.5 ? 'rect' : 'circle';
  }

  update() {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
    this.rotation += this.rotSpeed;
    return this.alpha <= 0;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;

    if (this.shape === 'rect') {
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.6);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ═══════════════════════════════════════
// GAME FUNCTIONS
// ═══════════════════════════════════════

function resetRound() {
  state.ballsRemaining = BALLS_PER_ROUND;
  state.ball = new Ball(W / 2, H - 80);
  state.nets = [];
  state.particles = [];
  state.frameCount = 0;
  state.speedMul = 1.0;
  state.spawnInterval = 90;
  state.screenFlash = 0;
  state.scorePop = 0;
  state.canShoot = true;
  state.endDelay = 0;
  state.ballBounceIdx = -1;
  state.ballBounceTimer = 0;
  state.charging = false;
  state.chargeFrames = 0;
  state.aimPos = null;
  const p = state.players[state.currentPlayer];
  p.goals = 0;
  p.shots = 0;
  p.best = loadBest(p.name);
}

function updateDifficulty() {
  const goals = state.players[state.currentPlayer].goals;
  if (goals >= 9)      { state.speedMul = 1.45; state.spawnInterval = 63; }
  else if (goals >= 6) { state.speedMul = 1.30; state.spawnInterval = 72; }
  else if (goals >= 3) { state.speedMul = 1.15; state.spawnInterval = 81; }
  else                 { state.speedMul = 1.00; state.spawnInterval = 90; }
}

function spawnNet() {
  const padding = NET_RING_WIDTH / 2 + 20;
  const x = padding + Math.random() * (W - padding * 2);
  state.nets.push(new Net(x));
}

function spawnConfetti(x, y, count) {
  for (let i = 0; i < count; i++) {
    if (state.particles.length < MAX_PARTICLES) {
      state.particles.push(new Particle(x, y, 'confetti'));
    }
  }
}

function checkCollision(ball, net) {
  if (ball.vy <= 0 || net.scored) return false;
  const r = net.getRingRect();
  return (
    ball.x > r.left &&
    ball.x < r.right &&
    ball.y > r.top &&
    ball.y < r.bottom
  );
}

function scoreGoal(net) {
  const p = state.players[state.currentPlayer];
  p.goals++;
  net.scored = true;
  net.flashTimer = 20;

  state.screenFlash = 0.3;
  state.scorePop = 1;

  spawnConfetti(net.x, net.y, 25);
  playGoal();
  playNetFlash();
  updateDifficulty();
}

function onBallDone() {
  state.ballBounceIdx = BALLS_PER_ROUND - state.ballsRemaining;
  state.ballBounceTimer = 10;

  if (state.ballsRemaining > 0) {
    state.canShoot = true;
    state.ball = new Ball(W / 2, H - 80);
  } else {
    // Round over — wait then show end screen
    state.endDelay = 108; // ~1.8 seconds at 60fps
  }
}

function showEndScreen() {
  const p = state.players[state.currentPlayer];
  const accuracy = p.shots > 0 ? Math.round((p.goals / p.shots) * 100) : 0;
  const isNewBest = p.goals > p.best;
  if (isNewBest) {
    saveBest(p.name, p.goals);
    p.best = p.goals;
  }

  // In 2P mode, after Player 2 finishes go straight to compare
  if (state.mode === 2 && state.currentPlayer === 1) {
    showCompareScreen();
    return;
  }

  document.getElementById('endTitle').textContent = p.name ? p.name + "'s Score" : "Your Score";
  document.getElementById('endScore').textContent = p.goals + ' / ' + BALLS_PER_ROUND;
  document.getElementById('endAccuracy').textContent = 'Accuracy: ' + accuracy + '%';
  document.getElementById('endBest').textContent = 'Personal Best: ' + p.best;

  let msg;
  if (p.goals === 0) msg = "Keep practicing, superstar!";
  else if (p.goals <= 3) msg = "Great start! Try again!";
  else if (p.goals <= 6) msg = "Brilliant shooting!";
  else if (p.goals <= 9) msg = "Amazing! You're a champion!";
  else msg = "PERFECT SCORE! You're incredible!";
  document.getElementById('endMessage').textContent = msg;

  const btn = document.getElementById('btnPlayAgain');
  if (state.mode === 2 && state.currentPlayer === 0) {
    btn.textContent = (state.players[1].name || 'Player 2') + "'s Turn!";
  } else {
    btn.textContent = "Play Again";
  }

  if (isNewBest && p.goals > 0) {
    playHighScore();
  } else {
    playEndNormal();
  }

  showScreen(endScreen);
}

function showCompareScreen() {
  const p1 = state.players[0];
  const p2 = state.players[1];

  document.getElementById('p1Name').textContent = p1.name || 'Player 1';
  document.getElementById('p1Score').textContent = p1.goals + ' / ' + BALLS_PER_ROUND;
  document.getElementById('p1Accuracy').textContent = (p1.shots > 0 ? Math.round((p1.goals / p1.shots) * 100) : 0) + '% accuracy';

  document.getElementById('p2Name').textContent = p2.name || 'Player 2';
  document.getElementById('p2Score').textContent = p2.goals + ' / ' + BALLS_PER_ROUND;
  document.getElementById('p2Accuracy').textContent = (p2.shots > 0 ? Math.round((p2.goals / p2.shots) * 100) : 0) + '% accuracy';

  const p1El = document.getElementById('p1Result');
  const p2El = document.getElementById('p2Result');
  p1El.classList.remove('winner');
  p2El.classList.remove('winner');

  let msg;
  if (p1.goals > p2.goals) {
    p1El.classList.add('winner');
    msg = (p1.name || 'Player 1') + ' wins! Amazing!';
  } else if (p2.goals > p1.goals) {
    p2El.classList.add('winner');
    msg = (p2.name || 'Player 2') + ' wins! Amazing!';
  } else {
    p1El.classList.add('winner');
    p2El.classList.add('winner');
    msg = "It's a tie! You're both champions!";
  }
  document.getElementById('compareMessage').textContent = msg;

  playHighScore();
  showScreen(compareScreen);
}

// ── Screen management ──
function showScreen(screen) {
  [menuScreen, nameScreen, endScreen, compareScreen].forEach(s => s.classList.add('hidden'));
  if (screen) screen.classList.remove('hidden');
  state.phase = screen === null ? 'PLAYING' : (
    screen === menuScreen ? 'MENU' :
    screen === nameScreen ? 'NAME_ENTRY' :
    screen === endScreen ? 'END_SCREEN' : 'COMPARE'
  );

  // Start/stop background music
  if (state.phase === 'PLAYING') {
    playChickenBanana();
  } else {
    stopChickenBanana();
  }
}

// ═══════════════════════════════════════
// UPDATE & RENDER
// ═══════════════════════════════════════

function update() {
  // Stars twinkle always
  state.bgStars.forEach(s => s.twinkle += s.speed);

  if (state.phase !== 'PLAYING') return;

  state.frameCount++;

  // Spawn nets
  if (state.frameCount % Math.max(45, state.spawnInterval) === 0) {
    spawnNet();
  }

  // Update nets
  for (let i = state.nets.length - 1; i >= 0; i--) {
    if (state.nets[i].update()) {
      state.nets.splice(i, 1);
    }
  }

  // Update ball
  if (state.ball && state.ball.active) {
    const result = state.ball.update();

    // Check collision with nets
    for (const net of state.nets) {
      if (checkCollision(state.ball, net)) {
        scoreGoal(net);
        state.ball.active = false;
        onBallDone();
        break;
      }
    }

    if (result === 'miss') {
      onBallDone();
    }
  }

  // Update particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    if (state.particles[i].update()) {
      state.particles.splice(i, 1);
    }
  }

  // Screen flash decay
  if (state.screenFlash > 0) state.screenFlash -= 0.015;

  // Score pop decay
  if (state.scorePop > 0) state.scorePop -= 0.05;

  // Charge power
  if (state.charging && state.chargeFrames < CHARGE_TIME) {
    state.chargeFrames++;
  }

  // Ball bounce animation
  if (state.ballBounceTimer > 0) state.ballBounceTimer--;

  // End delay
  if (state.endDelay > 0) {
    state.endDelay--;
    if (state.endDelay <= 0) {
      showEndScreen();
    }
  }
}

function render() {
  // ── Background ──
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#1a0033');
  bgGrad.addColorStop(0.5, '#3d0066');
  bgGrad.addColorStop(1, '#6600aa');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Court floor glow
  ctx.globalAlpha = 0.15;
  const floorGrad = ctx.createRadialGradient(W / 2, H, 10, W / 2, H, W * 0.6);
  floorGrad.addColorStop(0, '#ff44cc');
  floorGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, H - 120, W, 120);
  ctx.globalAlpha = 1;

  // ── Stars ──
  state.bgStars.forEach(s => {
    const alpha = 0.4 + Math.sin(s.twinkle) * 0.4;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  if (state.phase === 'PLAYING') {
    // ── Nets ──
    state.nets.forEach(n => n.draw());

    // ── Aim guide + power bar ──
    if (state.charging && state.aimPos && state.ball && !state.ball.active) {
      const power = state.chargeFrames / CHARGE_TIME;
      const bx = state.ball.x;
      const by = state.ball.y;
      const dx = state.aimPos.x - bx;
      const dy = state.aimPos.y - by;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        const nx = dx / dist;
        const ny = dy / dist;
        const speed = LAUNCH_SPEED_MIN + power * (LAUNCH_SPEED_MAX - LAUNCH_SPEED_MIN);

        // Dotted aim line
        ctx.strokeStyle = 'rgba(255,200,255,0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + nx * 80, by + ny * 80);
        ctx.stroke();
        ctx.setLineDash([]);

        // Trajectory preview dots
        ctx.fillStyle = 'rgba(255,200,255,0.3)';
        let px = bx, py = by;
        let pvx = nx * speed, pvy = ny * speed;
        for (let i = 0; i < 20; i++) {
          pvy += GRAVITY;
          px += pvx;
          py += pvy;
          if (py > H || px < 0 || px > W) break;
          ctx.globalAlpha = 0.3 - i * 0.013;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Power bar
        const barW = 120;
        const barH = 10;
        const barX = W / 2 - barW / 2;
        const barY = H - 100;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 5);
        ctx.fill();

        // Fill
        const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        barGrad.addColorStop(0, '#ff88dd');
        barGrad.addColorStop(0.7, '#ff44cc');
        barGrad.addColorStop(1, '#ffee44');
        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * power, barH, 5);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(255,200,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 5);
        ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(255,204,255,0.7)';
        ctx.font = '11px "Fredoka One", cursive';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('POWER', W / 2, barY + 14);
      }
    }

    // ── Ball ──
    if (state.ball) state.ball.draw();

    // ── Particles ──
    state.particles.forEach(p => p.draw());

    // ── Screen flash ──
    if (state.screenFlash > 0) {
      ctx.globalAlpha = state.screenFlash;
      ctx.fillStyle = '#ff44cc';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // ── HUD ──
    drawHUD();
  }
}

function drawHUD() {
  const p = state.players[state.currentPlayer];
  ctx.textBaseline = 'top';

  // Frosted pill background helper
  function drawPill(x, y, w, h) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    const r = h / 2;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + r, r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.fill();
  }

  // Score — top left
  drawPill(10, 10, 120, 36);
  ctx.fillStyle = '#fff';
  ctx.font = '18px "Fredoka One", cursive';
  ctx.textAlign = 'left';

  const scoreScale = 1 + state.scorePop * 0.3;
  if (state.scorePop > 0) {
    ctx.save();
    ctx.translate(70, 28);
    ctx.scale(scoreScale, scoreScale);
    ctx.translate(-70, -28);
  }
  ctx.fillText((p.name || 'Player') + ': ' + p.goals, 20, 18);
  if (state.scorePop > 0) ctx.restore();

  // Title — top centre
  const titleW = 180;
  drawPill(W / 2 - titleW / 2, 10, titleW, 36);
  ctx.fillStyle = '#ffccff';
  ctx.font = '16px "Fredoka One", cursive';
  ctx.textAlign = 'center';
  ctx.fillText('Wingy Netball', W / 2, 18);

  // Best — top right
  drawPill(W - 130, 10, 120, 36);
  ctx.fillStyle = '#ffee44';
  ctx.font = '16px "Fredoka One", cursive';
  ctx.textAlign = 'right';
  ctx.fillText('Best: ' + p.best, W - 20, 18);

  // ── Ball Inventory — bottom ──
  const invY = H - 50;
  const ballSize = 10;
  const gap = 28;
  const totalW = BALLS_PER_ROUND * gap;
  const startX = W / 2 - totalW / 2 + gap / 2;

  // Background pill
  drawPill(startX - 20, invY - 16, totalW + 24, 40);

  // Label
  ctx.fillStyle = 'rgba(255,204,255,0.6)';
  ctx.font = '11px "Fredoka One", cursive';
  ctx.textAlign = 'center';
  ctx.fillText('Balls Remaining', W / 2, invY + 16);

  for (let i = 0; i < BALLS_PER_ROUND; i++) {
    const used = i < (BALLS_PER_ROUND - state.ballsRemaining);
    const bx = startX + i * gap;
    let by = invY;
    let size = ballSize;

    // Bounce animation for just-used ball
    if (i === state.ballBounceIdx && state.ballBounceTimer > 0) {
      by -= Math.sin((state.ballBounceTimer / 10) * Math.PI) * 8;
    }

    if (used) {
      ctx.globalAlpha = 0.25;
      size *= 0.7;
    } else {
      ctx.globalAlpha = 1;
    }

    const g = ctx.createRadialGradient(bx - 1, by - 1, 1, bx, by, size);
    g.addColorStop(0, '#ffaadd');
    g.addColorStop(1, used ? '#666' : '#cc2299');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ═══════════════════════════════════════
// INPUT
// ═══════════════════════════════════════

function getInputPos(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function handleDown(e) {
  if (state.phase !== 'PLAYING') return;
  if (!state.canShoot || !state.ball || state.ball.active) return;
  if (state.ballsRemaining <= 0) return;

  e.preventDefault();
  const pos = getInputPos(e);

  // Only aim upward
  if (pos.y >= state.ball.y - 20) return;

  state.charging = true;
  state.chargeFrames = 0;
  state.aimPos = pos;
}

function handleMove(e) {
  if (!state.charging) return;
  e.preventDefault();
  state.aimPos = getInputPos(e);
}

function handleUp(e) {
  if (!state.charging) return;
  e.preventDefault();

  const pos = state.aimPos;
  state.charging = false;

  if (!state.canShoot || !state.ball || state.ball.active) return;
  if (state.ballsRemaining <= 0) return;
  if (!pos || pos.y >= state.ball.y - 20) return;

  const power = Math.min(state.chargeFrames / CHARGE_TIME, 1);
  const speed = LAUNCH_SPEED_MIN + power * (LAUNCH_SPEED_MAX - LAUNCH_SPEED_MIN);

  state.ballsRemaining--;
  state.players[state.currentPlayer].shots++;
  state.canShoot = false;
  state.ball.launch(pos.x, pos.y, speed);
  state.aimPos = null;
}

canvas.addEventListener('mousedown', handleDown);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleUp);
canvas.addEventListener('touchstart', handleDown, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleUp, { passive: false });

// ═══════════════════════════════════════
// BUTTON HANDLERS
// ═══════════════════════════════════════

document.getElementById('btn1Player').addEventListener('click', () => {
  ensureAudio();
  state.mode = 1;
  player2Group.classList.add('hidden');
  document.getElementById('player1Name').value = '';
  showScreen(nameScreen);
  document.getElementById('player1Name').focus();
});

document.getElementById('btn2Players').addEventListener('click', () => {
  ensureAudio();
  state.mode = 2;
  player2Group.classList.remove('hidden');
  document.getElementById('player1Name').value = '';
  document.getElementById('player2Name').value = '';
  showScreen(nameScreen);
  document.getElementById('player1Name').focus();
});

document.getElementById('btnStartGame').addEventListener('click', () => {
  const name1 = document.getElementById('player1Name').value.trim() || 'Player 1';
  const name2 = document.getElementById('player2Name').value.trim() || 'Player 2';

  state.players[0].name = name1;
  state.players[1].name = name2;
  state.currentPlayer = 0;
  resetRound();
  showScreen(null); // PLAYING
});

document.getElementById('btnPlayAgain').addEventListener('click', () => {
  if (state.mode === 2 && state.currentPlayer === 0) {
    // Switch to player 2
    state.currentPlayer = 1;
    resetRound();
    showScreen(null); // PLAYING
  } else {
    // 1P replay
    state.currentPlayer = 0;
    resetRound();
    showScreen(null);
  }
});

document.getElementById('btnEndMenu').addEventListener('click', () => {
  stopChickenBanana();
  showScreen(menuScreen);
});

document.getElementById('btnMuteMusic').addEventListener('click', () => {
  const muted = toggleMuteMusic();
  document.getElementById('btnMuteMusic').textContent = muted ? 'Music: OFF' : 'Music: ON';
});

document.getElementById('btnCompareAgain').addEventListener('click', () => {
  showScreen(nameScreen);
  document.getElementById('player1Name').value = state.players[0].name;
  document.getElementById('player2Name').value = state.players[1].name;
});

document.getElementById('btnBackMenu').addEventListener('click', () => {
  stopChickenBanana();
  showScreen(menuScreen);
});

// ═══════════════════════════════════════
// GAME LOOP
// ═══════════════════════════════════════

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// Reinit stars on resize
window.addEventListener('resize', () => {
  setTimeout(initStars, 50);
});

requestAnimationFrame(gameLoop);
