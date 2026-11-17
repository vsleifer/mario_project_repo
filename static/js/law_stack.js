// Library Stack: the Law School minigame. Drop books onto a growing pile;
// overhang falls off, missing the pile ends the round. 45-second rounds.
(function () {
  "use strict";

  var root = document.getElementById("law-stack");
  if (!root) return;

  var canvas = root.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var W = 360, H = 540;
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  var ROUND_SECONDS = 45;
  var BOOK_H = 24;
  var DESK_Y = H - 70;          // top of the reading-room desk, in world space
  var START_W = 190;
  var PERFECT_PX = 5;
  var SPINES = ["#7b2d26", "#1f4e5f", "#2f5d3a", "#5a3a6e", "#8c6b1f", "#36406b", "#6b2f4a", "#00356b"];

  var hud = {
    score: root.querySelector('[data-hud="score"]'),
    time: root.querySelector('[data-hud="time"]'),
    best: root.querySelector('[data-hud="best"]')
  };
  var startPanel = root.querySelector('[data-panel="start"]');
  var overPanel = root.querySelector('[data-panel="over"]');
  var resultScore = root.querySelector('[data-result="score"]');
  var resultSave = root.querySelector('[data-result="save"]');
  var csrfToken = root.querySelector("input[name=csrfmiddlewaretoken]").value;

  var state = "ready";          // ready | playing | over
  var stack, moving, falling, score, timeLeft, camera, lastTs, flash;

  function bookAt(level, x, w, color) {
    return { x: x, w: w, level: level, color: color, title: Math.random() };
  }

  function reset() {
    stack = [bookAt(0, (W - START_W) / 2, START_W, "#5b3b24")];   // level 0 is the desk
    falling = [];
    score = 0;
    timeLeft = ROUND_SECONDS;
    camera = 0;
    flash = 0;
    spawn();
    updateHud();
  }

  function spawn() {
    var top = stack[stack.length - 1];
    var fromLeft = stack.length % 2 === 1;
    var speed = Math.min(130 + stack.length * 9, 430);
    moving = bookAt(stack.length, fromLeft ? -top.w * 0.5 : W - top.w * 0.5, top.w,
      SPINES[stack.length % SPINES.length]);
    moving.dir = fromLeft ? 1 : -1;
    moving.speed = speed;
  }

  function levelY(level) {
    return DESK_Y - level * BOOK_H;
  }

  function drop() {
    if (state !== "playing") return;
    var top = stack[stack.length - 1];
    var left = Math.max(moving.x, top.x);
    var right = Math.min(moving.x + moving.w, top.x + top.w);
    var overlap = right - left;

    if (overlap <= 0) {
      falling.push(fallingPiece(moving, moving.x, moving.w));
      moving = null;
      end();
      return;
    }

    if (Math.abs(moving.x - top.x) <= PERFECT_PX) {
      left = top.x;
      overlap = top.w;
      score += 2;
      flash = 1;
    } else {
      score += 1;
      if (moving.x < top.x) falling.push(fallingPiece(moving, moving.x, top.x - moving.x));
      if (moving.x + moving.w > top.x + top.w) {
        falling.push(fallingPiece(moving, top.x + top.w, moving.x + moving.w - (top.x + top.w)));
      }
    }
    stack.push(bookAt(moving.level, left, overlap, moving.color));
    updateHud();
    spawn();
  }

  function fallingPiece(book, x, w) {
    return { x: x, w: w, y: levelY(book.level), vy: 0, spin: 0, dir: x < W / 2 ? -1 : 1, color: book.color };
  }

  function start() {
    reset();
    state = "playing";
    startPanel.hidden = true;
    overPanel.hidden = true;
    canvas.focus();
  }

  function end() {
    state = "over";
    resultScore.textContent = score;
    resultSave.textContent = "Saving your score…";
    overPanel.hidden = false;
    saveScore(score);
  }

  function saveScore(value) {
    fetch(root.dataset.scoreUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
      body: JSON.stringify({ score: value })
    })
      .then(function (response) {
        return response.json().then(function (data) { return { ok: response.ok, data: data }; });
      })
      .then(function (result) {
        if (!result.ok) throw new Error(result.data.error || "Could not save");
        resultSave.textContent = "Saved! You now have " + result.data.school_credits + " Law credits.";
        if (value > Number(hud.best.textContent)) hud.best.textContent = value;
      })
      .catch(function () {
        resultSave.textContent = "We couldn't save that score. Check your connection and play again.";
      });
  }

  function updateHud() {
    hud.score.textContent = score;
    hud.time.textContent = Math.ceil(timeLeft);
  }

  function update(dt) {
    if (state === "playing") {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        updateHud();
        end();
      } else {
        hud.time.textContent = Math.ceil(timeLeft);
      }
    }
    if (moving && state === "playing") {
      moving.x += moving.dir * moving.speed * dt;
      var minX = -moving.w * 0.6, maxX = W - moving.w * 0.4;
      if (moving.x < minX) { moving.x = minX; moving.dir = 1; }
      if (moving.x > maxX) { moving.x = maxX; moving.dir = -1; }
    }
    falling.forEach(function (p) {
      p.vy += 1400 * dt;
      p.y += p.vy * dt;
      p.spin += p.dir * 3 * dt;
    });
    falling = falling.filter(function (p) { return p.y - camera < H + 80; });

    // Keep the top of the pile about a third of the way down the screen.
    var target = Math.max(0, (stack.length - 11) * BOOK_H);
    camera += (target - camera) * Math.min(1, dt * 6);
    flash = Math.max(0, flash - dt * 2.5);
  }

  function drawBackground() {
    ctx.fillStyle = "#efe6d2";
    ctx.fillRect(0, 0, W, H);
    // Shelves scroll slower than the pile, for depth.
    var shelfH = 92, offset = (camera * 0.4) % shelfH;
    for (var y = -shelfH + offset; y < H; y += shelfH) {
      ctx.fillStyle = "#d9c8a6";
      ctx.fillRect(0, y, W, shelfH - 10);
      for (var x = 6, i = 0; x < W - 10; i++) {
        var w = 9 + ((i * 7 + Math.floor(y)) % 5) * 2;
        var h = shelfH - 24 - ((i * 13) % 4) * 5;
        ctx.fillStyle = SPINES[(i + Math.floor(y / shelfH)) % SPINES.length];
        ctx.globalAlpha = 0.22;
        ctx.fillRect(x, y + (shelfH - 10 - h), w, h);
        ctx.globalAlpha = 1;
        x += w + 2;
      }
      ctx.fillStyle = "#a07d4f";
      ctx.fillRect(0, y + shelfH - 10, W, 10);
    }
    // Arched reading-room windows, a nod to the library's Gothic hall.
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffffff";
    [70, 290].forEach(function (cx) {
      var top = 40 + (camera * 0.2) % 600;
      ctx.beginPath();
      ctx.moveTo(cx - 28, top + 120);
      ctx.lineTo(cx - 28, top + 30);
      ctx.quadraticCurveTo(cx, top - 10, cx + 28, top + 30);
      ctx.lineTo(cx + 28, top + 120);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawBook(x, y, w, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, BOOK_H - 2);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(x, y, w, 4);
    if (w > 24) {
      ctx.fillStyle = "#d8b64a";              // gilt bands near each end
      ctx.fillRect(x + 6, y + 3, 2, BOOK_H - 8);
      ctx.fillRect(x + w - 8, y + 3, 2, BOOK_H - 8);
    }
    if (w > 70) {
      ctx.fillStyle = "#f3e7c4";              // title label
      ctx.fillRect(x + w / 2 - 18, y + 7, 36, 8);
    }
  }

  function draw() {
    drawBackground();
    ctx.save();
    ctx.translate(0, camera);

    // Desk
    var desk = stack[0];
    ctx.fillStyle = "#5b3b24";
    ctx.fillRect(desk.x - 30, DESK_Y, desk.w + 60, 18);
    ctx.fillStyle = "#3f2818";
    ctx.fillRect(desk.x - 10, DESK_Y + 18, 14, 60);
    ctx.fillRect(desk.x + desk.w - 4, DESK_Y + 18, 14, 60);
    ctx.fillStyle = "#2f6b3f";                  // green banker's-lamp shade
    ctx.fillRect(desk.x + desk.w + 2, DESK_Y - 22, 26, 10);
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(desk.x + desk.w + 13, DESK_Y - 12, 4, 12);

    for (var i = 1; i < stack.length; i++) {
      drawBook(stack[i].x, levelY(stack[i].level), stack[i].w, stack[i].color);
    }
    if (moving) drawBook(moving.x, levelY(moving.level), moving.w, moving.color);
    falling.forEach(function (p) {
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + BOOK_H / 2);
      ctx.rotate(p.spin);
      drawBook(-p.w / 2, -BOOK_H / 2, p.w, p.color);
      ctx.restore();
    });
    ctx.restore();

    if (flash > 0) {
      ctx.globalAlpha = flash;
      ctx.fillStyle = "#00356b";
      ctx.font = "700 22px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("Perfect! +2", W / 2, 60);
      ctx.globalAlpha = 1;
    }
  }

  function frame(ts) {
    var dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0;
    lastTs = ts;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  root.querySelectorAll('[data-action="start"]').forEach(function (button) {
    button.addEventListener("click", start);
  });
  canvas.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    drop();
  });
  document.addEventListener("keydown", function (event) {
    if (event.code === "Space" || event.code === "Enter" || event.code === "ArrowDown") {
      if (state === "playing") {
        event.preventDefault();
        drop();
      } else if (event.code === "Space" && document.activeElement === document.body) {
        event.preventDefault();
        start();
      }
    }
  });

  canvas.tabIndex = 0;
  reset();
  requestAnimationFrame(frame);
})();
