// Shared engine for the canvas minigames on core/games/game.html.
//
// A game calls MiniGame.create(spec) with:
//   seconds            round length
//   reset(g, starting) set up a fresh round (g.score is already 0); starting is
//                      false for the preview drawn behind the Start button
//   update(g, dt)      advance the game by dt seconds while playing
//   draw(g, ctx)       draw a frame (also called before start and after the end)
//   pointer(g, type, x, y)   optional; type is "down" | "move" | "up"; x, y in canvas units
//   key(g, code, isDown)     optional; return true if the key was used
//
// The engine handles the timer, HUD, start/end overlays, HiDPI scaling, input,
// and POSTing the final score to the server. Games call g.add(points) to score,
// g.status(text) to show a short HUD message, and g.end() to finish early.
(function () {
  "use strict";

  function create(spec) {
    var root = document.getElementById("minigame");
    if (!root) return null;

    var canvas = root.querySelector("canvas");
    var ctx = canvas.getContext("2d");
    var W = 360, H = 540;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    var hud = {
      score: root.querySelector('[data-hud="score"]'),
      time: root.querySelector('[data-hud="time"]'),
      best: root.querySelector('[data-hud="best"]'),
      status: root.querySelector('[data-hud="status"]')
    };
    var startPanel = root.querySelector('[data-panel="start"]');
    var overPanel = root.querySelector('[data-panel="over"]');
    var resultScore = root.querySelector('[data-result="score"]');
    var resultSave = root.querySelector('[data-result="save"]');
    var csrfToken = root.querySelector("input[name=csrfmiddlewaretoken]").value;
    var muteBox = root.querySelector('[data-option="mute"]');

    var g = {
      W: W, H: H, ctx: ctx, canvas: canvas,
      state: "ready",          // ready | playing | over
      score: 0,
      time: 0,                 // seconds since the round started
      timeLeft: spec.seconds,
      muted: function () { return !!(muteBox && muteBox.checked); },
      add: function (points) {
        g.score = Math.max(0, g.score + points);
        hud.score.textContent = g.score;
      },
      status: function (text) {
        if (hud.status) hud.status.textContent = text || "";
      },
      end: end
    };

    hud.time.textContent = spec.seconds;

    function start() {
      g.score = 0;
      g.time = 0;
      g.timeLeft = spec.seconds;
      g.status("");
      hud.score.textContent = "0";
      spec.reset(g, true);
      g.state = "playing";
      startPanel.hidden = true;
      overPanel.hidden = true;
      canvas.focus();
    }

    function end() {
      if (g.state !== "playing") return;
      g.state = "over";
      if (spec.onEnd) spec.onEnd(g);
      resultScore.textContent = g.score;
      resultSave.textContent = "Saving your score…";
      overPanel.hidden = false;
      save(g.score);
    }

    function save(value) {
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
          resultSave.textContent = "Saved! You now have " + result.data.school_credits + " " +
            root.dataset.creditsLabel + ".";
          if (value > Number(hud.best.textContent)) hud.best.textContent = value;
        })
        .catch(function () {
          resultSave.textContent = "We couldn't save that score. Check your connection and play again.";
        });
    }

    var lastTs = 0;
    function frame(ts) {
      var dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0;
      lastTs = ts;
      if (g.state === "playing") {
        g.time += dt;
        g.timeLeft = Math.max(0, spec.seconds - g.time);
        hud.time.textContent = Math.ceil(g.timeLeft);
        spec.update(g, dt);
        if (g.timeLeft <= 0) end();
      }
      spec.draw(g, ctx);
      requestAnimationFrame(frame);
    }

    function toCanvas(event) {
      var rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height };
    }

    if (spec.pointer) {
      ["down", "move", "up"].forEach(function (type) {
        var target = type === "down" ? canvas : window;
        target.addEventListener("pointer" + type, function (event) {
          if (g.state !== "playing") return;
          if (type === "down") {
            event.preventDefault();
            if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
          }
          var p = toCanvas(event);
          spec.pointer(g, type, p.x, p.y);
        });
      });
      window.addEventListener("pointercancel", function () {
        if (g.state === "playing") spec.pointer(g, "up", -1, -1);
      });
    }

    function onKey(event, isDown) {
      if (g.state === "playing") {
        if (spec.key && spec.key(g, event.code, isDown)) event.preventDefault();
      } else if (isDown && event.code === "Space" && document.activeElement === document.body) {
        event.preventDefault();
        start();
      }
    }
    document.addEventListener("keydown", function (event) { if (!event.repeat) onKey(event, true); });
    document.addEventListener("keyup", function (event) { onKey(event, false); });

    root.querySelectorAll('[data-action="start"]').forEach(function (button) {
      button.addEventListener("click", start);
    });

    spec.reset(g, false);
    requestAnimationFrame(frame);
    return g;
  }

  // Small drawing helpers shared by the games.
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function popText(ctx, text, x, y, alpha, color) {
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = color || "#ffffff";
    ctx.font = "700 18px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
    ctx.globalAlpha = 1;
  }

  window.MiniGame = { create: create, roundRect: roundRect, popText: popText };
})();
