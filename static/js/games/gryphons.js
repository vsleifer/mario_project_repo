// Last Call at Gryphon's: the Gryphon's Pub minigame, in two rounds.
// Round 1 (0-20 s): hold to pour, release at the line. Round 2 (20-45 s):
// cups slide down three bar lanes; move to the right lane to catch each one.
(function () {
  "use strict";

  var SECONDS = 45, POUR_UNTIL = 20;
  var GLASS = { x: 125, y: 170, w: 110, h: 230 };
  var LANE_X = [80, 180, 280], CATCH_Y = 452;

  var round, pour, cups, player, spawnIn, pops;

  function newGlass() {
    return { fill: 0, line: 0.65 + Math.random() * 0.25, pouring: false, cooldown: 0.4, overflow: 0 };
  }

  function release(g) {
    var p = pour;
    if (!p.pouring) return;
    p.pouring = false;
    if (p.fill < 0.05) return;                     // an accidental tap
    var miss = Math.abs(p.fill - p.line);
    var points = miss <= 0.03 ? 5 : miss <= 0.07 ? 3 : miss <= 0.15 ? 1 : 0;
    var label = points === 5 ? "Perfect pint! +5" : points ? "+" + points : (p.fill < p.line ? "Short pour" : "Too much head");
    g.add(points);
    pops.push({ text: label, x: 180, y: 140, life: 0.9 });
    pour = newGlass();
    pour.cooldown = 0.6;
  }

  function startSlideRound(g) {
    round = 2;
    pour.pouring = false;
    cups = [];
    player = 1;
    spawnIn = 0.6;
    g.status("Round 2: catch!");
    pops.push({ text: "Round 2: catch the cups!", x: 180, y: 240, life: 1.5 });
  }

  MiniGame.create({
    seconds: SECONDS,

    reset: function (g) {
      round = 1;
      pour = newGlass();
      cups = [];
      player = 1;
      pops = [];
      g.status("Round 1: pour");
    },

    update: function (g, dt) {
      if (round === 1 && g.time >= POUR_UNTIL) startSlideRound(g);

      if (round === 1) {
        var p = pour;
        p.cooldown = Math.max(0, p.cooldown - dt);
        p.overflow = Math.max(0, p.overflow - dt);
        if (p.pouring && p.cooldown === 0) {
          p.fill += (0.5 + g.time * 0.008) * dt;
          if (p.fill >= 1.02) {
            p.pouring = false;
            pops.push({ text: "Overflow!", x: 180, y: 140, life: 0.9 });
            pour = newGlass();
            pour.cooldown = 0.8;
            pour.overflow = 0.8;
          }
        }
      } else {
        var progress = (g.time - POUR_UNTIL) / (SECONDS - POUR_UNTIL);
        spawnIn -= dt;
        if (spawnIn <= 0) {
          cups.push({ lane: Math.floor(Math.random() * 3), y: 70, speed: 160 + progress * 110 + Math.random() * 30 });
          spawnIn = 1.1 - progress * 0.45;
        }
        cups.forEach(function (c) {
          c.y += c.speed * dt;
          if (!c.done && c.y >= CATCH_Y) {
            c.done = true;
            if (c.lane === player) {
              c.caught = true;
              g.add(1);
              pops.push({ text: "+1", x: LANE_X[c.lane], y: CATCH_Y - 30, life: 0.5 });
            } else {
              pops.push({ text: "Smash!", x: LANE_X[c.lane], y: CATCH_Y + 30, life: 0.6 });
            }
          }
        });
        cups = cups.filter(function (c) { return !c.caught && c.y < g.H + 40; });
      }
      pops.forEach(function (q) { q.life -= dt; q.y -= 25 * dt; });
      pops = pops.filter(function (q) { return q.life > 0; });
    },

    pointer: function (g, type, x) {
      if (round === 1) {
        if (type === "down") pour.pouring = true;
        if (type === "up") release(g);
      } else if (type === "down") {
        player = x < 130 ? 0 : x < 230 ? 1 : 2;
      }
    },

    key: function (g, code, isDown) {
      if (round === 1 && (code === "Space" || code === "Enter")) {
        if (isDown) pour.pouring = true; else release(g);
        return true;
      }
      if (round === 2 && isDown && (code === "ArrowLeft" || code === "ArrowRight")) {
        player = Math.max(0, Math.min(2, player + (code === "ArrowLeft" ? -1 : 1)));
        return true;
      }
      return code === "Space" || code === "ArrowLeft" || code === "ArrowRight";
    },

    draw: function (g, ctx) {
      // Dark wood paneling and a Gothic window, as in the Hall of Graduate Studies
      ctx.fillStyle = "#3b2416";
      ctx.fillRect(0, 0, g.W, g.H);
      ctx.fillStyle = "#4a2e1c";
      for (var px = 0; px < g.W; px += 60) ctx.fillRect(px + 6, 0, 48, g.H);
      ctx.fillStyle = "#24435c";
      ctx.beginPath();
      ctx.moveTo(150, 120);
      ctx.lineTo(150, 50);
      ctx.quadraticCurveTo(180, 10, 210, 50);
      ctx.lineTo(210, 120);
      ctx.fill();
      ctx.strokeStyle = "#8a6a3f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(180, 25); ctx.lineTo(180, 120);
      ctx.moveTo(150, 80); ctx.lineTo(210, 80);
      ctx.stroke();

      ctx.fillStyle = "#e9c46a";
      ctx.font = "700 18px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("GRYPHON'S PUB", g.W / 2, 150);

      if (round === 1 && pour) {
        // Tap handle and stream
        ctx.fillStyle = "#c9a227";
        ctx.fillRect(170, 156, 20, 14);
        if (pour.pouring && pour.cooldown === 0) {
          ctx.fillStyle = "#d9952b";
          ctx.fillRect(176, 170, 8, GLASS.y + GLASS.h - 170 - GLASS.h * Math.min(1, pour.fill));
        }
        // Glass (slightly tapered) with beer and foam
        var gx = GLASS.x, gy = GLASS.y, gw = GLASS.w, gh = GLASS.h;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + gw, gy);
        ctx.lineTo(gx + gw - 12, gy + gh);
        ctx.lineTo(gx + 12, gy + gh);
        ctx.closePath();
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fill();
        ctx.clip();
        var level = gh * Math.min(1, pour.fill);
        ctx.fillStyle = "#e0a030";
        ctx.fillRect(gx, gy + gh - level, gw, level);
        if (level > 8) {
          ctx.fillStyle = "#fbf3dc";
          ctx.fillRect(gx, gy + gh - level - 2, gw, Math.min(16, level * 0.2));
        }
        ctx.restore();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + 12, gy + gh);
        ctx.lineTo(gx + gw - 12, gy + gh);
        ctx.lineTo(gx + gw, gy);
        ctx.stroke();
        // Fill line
        var lineY = gy + gh - gh * pour.line;
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gx - 18, lineY);
        ctx.lineTo(gx + gw + 18, lineY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("line", gx + gw + 20, lineY + 4);
        if (pour.overflow > 0) {
          ctx.globalAlpha = pour.overflow;
          ctx.fillStyle = "#fbf3dc";
          ctx.fillRect(gx - 10, gy + gh + 2, gw + 20, 10);
          ctx.globalAlpha = 1;
        }
        // Bar top
        ctx.fillStyle = "#6b3f22";
        ctx.fillRect(0, GLASS.y + GLASS.h, g.W, 26);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(g.state === "playing" ? "Hold to pour, let go at the line" : "", g.W / 2, 470);
      } else if (cups) {
        // Three bar lanes
        LANE_X.forEach(function (lx, i) {
          ctx.fillStyle = i === player ? "#7a4a28" : "#6b3f22";
          ctx.fillRect(lx - 40, 165, 80, g.H - 165);
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.fillRect(lx - 40, 165, 4, g.H - 165);
        });
        cups.forEach(function (c) {
          var cx = LANE_X[c.lane];
          ctx.fillStyle = "#e0a030";
          MiniGame.roundRect(ctx, cx - 16, c.y - 22, 32, 40, 4);
          ctx.fill();
          ctx.fillStyle = "#fbf3dc";
          ctx.fillRect(cx - 16, c.y - 24, 32, 8);
          ctx.strokeStyle = "#f5deb3";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(cx + 18, c.y - 2, 8, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
        });
        // Bartender
        var bx = LANE_X[player];
        ctx.fillStyle = "#f1d3b3";
        ctx.beginPath();
        ctx.arc(bx, CATCH_Y + 22, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#00356b";
        MiniGame.roundRect(ctx, bx - 22, CATCH_Y + 34, 44, 40, 6);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(bx - 12, CATCH_Y + 40, 24, 34);   // apron
        ctx.strokeStyle = "#e9c46a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx - 30, CATCH_Y + 8);
        ctx.lineTo(bx + 30, CATCH_Y + 8);
        ctx.stroke();
      }

      pops.forEach(function (q) { MiniGame.popText(ctx, q.text, q.x, q.y, q.life, "#ffffff"); });
    }
  });
})();
