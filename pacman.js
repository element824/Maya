(function () {
  const canvas = document.getElementById('pacman-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const CELL = 20;
  const COLS = 21;
  const ROWS = 21;
  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL;

  // 1 = wall, 0 = dot, 2 = empty, 3 = power pellet
  const MAP_TEMPLATE = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,0,1,0,0,1,1,1,0,1,1,0,1],
    [1,3,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,3,1],
    [1,0,0,0,0,1,0,1,1,0,1,0,1,1,0,1,0,0,0,0,1],
    [1,1,1,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,1,1,1],
    [2,2,1,0,0,1,0,1,1,1,2,1,1,1,0,1,0,0,1,2,2],
    [1,1,1,0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,1,1,1],
    [2,2,2,0,0,1,0,1,2,2,2,2,2,1,0,1,0,0,2,2,2],
    [1,1,1,0,0,1,0,1,1,1,1,1,1,1,0,1,0,0,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,0,1,0,1,0,1,0,1,1,0,1,1,0,1],
    [1,3,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,3,1],
    [1,1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,0,0,0,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,1,0,0,1,0,1,0,1,0,0,1,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ];

  let map, score, lives, pac, ghosts, dir, nextDir, mouthOpen, mouthTimer;
  let powerMode, powerTimer, gameOver, started, animId;

  const GHOST_COLORS = ['#ff6b9d', '#67e8f9', '#fb923c', '#c084fc'];

  function reset() {
    map = MAP_TEMPLATE.map(r => [...r]);
    score = 0;
    lives = 3;
    pac = { x: 10, y: 16 };
    dir = { x: 0, y: 0 };
    nextDir = { x: 0, y: 0 };
    mouthOpen = true;
    mouthTimer = 0;
    powerMode = false;
    powerTimer = 0;
    gameOver = false;
    ghosts = [
      { x: 9,  y: 8, dx: 1,  dy: 0 },
      { x: 10, y: 8, dx: -1, dy: 0 },
      { x: 11, y: 8, dx: 0,  dy: -1 },
      { x: 10, y: 7, dx: 0,  dy: 1 },
    ];
    updateHUD();
  }

  function updateHUD() {
    document.getElementById('pac-score').textContent = score;
    document.getElementById('pac-lives').textContent = lives;
  }

  function canMove(x, y) {
    if (y < 0 || y >= ROWS) return false;
    if (x < 0 || x >= COLS) return true; // tunnel
    return map[y][x] !== 1;
  }

  function wrap(x, y) {
    if (x < 0) x = COLS - 1;
    if (x >= COLS) x = 0;
    return { x, y };
  }

  function movePac() {
    let nx = pac.x + nextDir.x;
    let ny = pac.y + nextDir.y;
    if (canMove(nx, ny)) {
      dir = { ...nextDir };
    }
    nx = pac.x + dir.x;
    ny = pac.y + dir.y;
    if (canMove(nx, ny)) {
      const w = wrap(nx, ny);
      pac.x = w.x;
      pac.y = w.y;
    }
    // eat dot
    if (map[pac.y] && map[pac.y][pac.x] === 0) {
      map[pac.y][pac.x] = 2;
      score += 10;
    }
    if (map[pac.y] && map[pac.y][pac.x] === 3) {
      map[pac.y][pac.x] = 2;
      score += 50;
      powerMode = true;
      powerTimer = 150;
    }
    updateHUD();
  }

  function moveGhosts() {
    ghosts.forEach(g => {
      const dirs = [
        { x: 1, y: 0 }, { x: -1, y: 0 },
        { x: 0, y: 1 }, { x: 0, y: -1 },
      ];
      // filter valid + not reverse
      let valid = dirs.filter(d =>
        canMove(g.x + d.x, g.y + d.y) &&
        !(d.x === -g.dx && d.y === -g.dy)
      );
      if (valid.length === 0) {
        valid = dirs.filter(d => canMove(g.x + d.x, g.y + d.y));
      }
      if (valid.length === 0) return;

      // chase or flee
      let chosen;
      if (powerMode) {
        // run from pac-man
        valid.sort((a, b) => {
          const da = Math.abs(g.x + a.x - pac.x) + Math.abs(g.y + a.y - pac.y);
          const db = Math.abs(g.x + b.x - pac.x) + Math.abs(g.y + b.y - pac.y);
          return db - da;
        });
        chosen = valid[0];
      } else {
        // 60% chase, 40% random
        if (Math.random() < 0.6) {
          valid.sort((a, b) => {
            const da = Math.abs(g.x + a.x - pac.x) + Math.abs(g.y + a.y - pac.y);
            const db = Math.abs(g.x + b.x - pac.x) + Math.abs(g.y + b.y - pac.y);
            return da - db;
          });
          chosen = valid[0];
        } else {
          chosen = valid[Math.floor(Math.random() * valid.length)];
        }
      }

      g.dx = chosen.x;
      g.dy = chosen.y;
      const w = wrap(g.x + g.dx, g.y + g.dy);
      g.x = w.x;
      g.y = w.y;
    });
  }

  function checkCollision() {
    ghosts.forEach((g, i) => {
      if (g.x === pac.x && g.y === pac.y) {
        if (powerMode) {
          score += 200;
          g.x = 10; g.y = 8;
          g.dx = 0; g.dy = -1;
          updateHUD();
        } else {
          lives--;
          updateHUD();
          if (lives <= 0) {
            gameOver = true;
          } else {
            pac.x = 10; pac.y = 16;
            dir = { x: 0, y: 0 };
            nextDir = { x: 0, y: 0 };
          }
        }
      }
    });
  }

  function checkWin() {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (map[r][c] === 0 || map[r][c] === 3) return false;
    return true;
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // map
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = map[r][c];
        if (v === 1) {
          ctx.fillStyle = '#1a1a6e';
          ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
          ctx.strokeStyle = '#4444cc';
          ctx.lineWidth = 1;
          ctx.strokeRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
        } else if (v === 0) {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (v === 3) {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // pac-man
    mouthTimer++;
    if (mouthTimer > 6) { mouthOpen = !mouthOpen; mouthTimer = 0; }
    const px = pac.x * CELL + CELL / 2;
    const py = pac.y * CELL + CELL / 2;
    let angle = 0;
    if (dir.x === 1) angle = 0;
    else if (dir.x === -1) angle = Math.PI;
    else if (dir.y === -1) angle = -Math.PI / 2;
    else if (dir.y === 1) angle = Math.PI / 2;
    const mouth = mouthOpen ? 0.25 : 0.05;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(px, py, CELL / 2 - 1, angle + Math.PI * mouth, angle - Math.PI * mouth);
    ctx.lineTo(px, py);
    ctx.fill();

    // ghosts
    ghosts.forEach((g, i) => {
      const gx = g.x * CELL + CELL / 2;
      const gy = g.y * CELL + CELL / 2;
      ctx.fillStyle = powerMode ? '#4444ff' : GHOST_COLORS[i];
      // body
      ctx.beginPath();
      ctx.arc(gx, gy - 2, CELL / 2 - 2, Math.PI, 0);
      ctx.lineTo(gx + CELL / 2 - 2, gy + CELL / 2 - 2);
      // wavy bottom
      for (let w = CELL / 2 - 2; w >= -(CELL / 2 - 2); w -= 4) {
        ctx.lineTo(gx + w, gy + CELL / 2 - 2 + (w % 8 === 0 ? -3 : 0));
      }
      ctx.closePath();
      ctx.fill();
      // eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(gx - 3, gy - 3, 3, 0, Math.PI * 2);
      ctx.arc(gx + 3, gy - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = powerMode ? '#fff' : '#111';
      ctx.beginPath();
      ctx.arc(gx - 3 + g.dx, gy - 3 + g.dy, 1.5, 0, Math.PI * 2);
      ctx.arc(gx + 3 + g.dx, gy - 3 + g.dy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff6b9d';
      ctx.font = 'bold 28px Fredoka';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '16px Fredoka';
      ctx.fillText('Click to play again', canvas.width / 2, canvas.height / 2 + 20);
    }

    if (checkWin()) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 28px Fredoka';
      ctx.textAlign = 'center';
      ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '16px Fredoka';
      ctx.fillText('Click to play again', canvas.width / 2, canvas.height / 2 + 20);
      gameOver = true;
    }
  }

  let tickCount = 0;
  function loop() {
    animId = requestAnimationFrame(loop);
    tickCount++;
    if (!started || gameOver) { draw(); return; }
    if (tickCount % 8 === 0) {
      movePac();
      if (tickCount % 10 === 0) moveGhosts();
      checkCollision();
      if (powerMode) {
        powerTimer--;
        if (powerTimer <= 0) powerMode = false;
      }
    }
    draw();
  }

  // controls
  document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)) {
      e.preventDefault();
      if (!started) started = true;
    }
    switch (key) {
      case 'arrowup':    case 'w': nextDir = { x: 0,  y: -1 }; break;
      case 'arrowdown':  case 's': nextDir = { x: 0,  y: 1 };  break;
      case 'arrowleft':  case 'a': nextDir = { x: -1, y: 0 };  break;
      case 'arrowright': case 'd': nextDir = { x: 1,  y: 0 };  break;
    }
  });

  canvas.addEventListener('click', () => {
    if (gameOver) {
      reset();
      started = false;
    } else if (!started) {
      started = true;
    }
  });

  reset();
  draw();
  loop();
})();
