// Suture Lab: the School of Medicine minigame. On a suture practice pad,
// drag the needle through each stitch dot in order. The closer you pass to a
// dot's center, the more it's worth; closing an incision earns a bonus.
(function () {
  "use strict";

  var SECONDS = 45;
  var PAD = { x: 24, y: 70, w: 312, h: 400 };
  var HIT_R = 18, PERFECT_R = 7;

  var incision, done, dragging, needle, pops, nextIn;

  function bezier(p0, p1, p2, t) {
    var u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y };
  }

  function makeIncision() {
    var vertical = Math.random() < 0.5;
    var a, b;
    if (vertical) {
      a = { x: 110 + Math.random() * 140, y: PAD.y + 50 };
      b = { x: 110 + Math.random() * 140, y: PAD.y + PAD.h - 50 };
    } else {
      a = { x: PAD.x + 45, y: 150 + Math.random() * 240 };
      b = { x: PAD.x + PAD.w - 45, y: 150 + Math.random() * 240 };
    }
    var c = { x: (a.x + b.x) / 2 + (Math.random() - 0.5) * 140, y: (a.y + b.y) / 2 + (Math.random() - 0.5) * 140 };
    var count = Math.min(6 + done, 9);
    var stitches = [];
    for (var i = 0; i < count; i++) {
      var t = (i + 0.5) / count;
      var p = bezier(a, c, b, t);
      var q = bezier(a, c, b, Math.min(1, t + 0.01));
      var len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      var side = i % 2 === 0 ? 1 : -1;            // zig-zag across the cut
      stitches.push({ x: p.x - (q.y - p.y) / len * 13 * side, y: p.y + (q.x - p.x) / len * 13 * side, minD: Infinity, hit: false });
    }
    return { a: a, b: b, c: c, stitches: stitches, next: 0 };
  }

  function award(g, s) {
    s.hit = true;
    var perfect = s.minD <= PERFECT_R;
    g.add(perfect ? 2 : 1);
    pops.push({ text: perfect ? "+2" : "+1", x: s.x, y: s.y - 16, life: 0.6, color: perfect ? "#1f6b3a" : "#00356b" });
    incision.next += 1;
    if (incision.next === incision.stitches.length) {
      done += 1;
      g.add(5);
      pops.push({ text: "Incision closed! +5", x: 180, y: 110, life: 1.1, color: "#1f6b3a" });
      nextIn = 0.8;
    }
  }

  function track(g, x, y) {
    if (!incision || nextIn > 0) return;
    var s = incision.stitches[incision.next];
    if (!s) return;
    var d = Math.hypot(x - s.x, y - s.y);
    if (d <= HIT_R) {
      s.minD = Math.min(s.minD, d);
    } else if (s.minD <= HIT_R) {
      award(g, s);                                 // scored on the way out, by closest pass
    }
  }

  MiniGame.create({
    seconds: SECONDS,

    reset: function () {
      done = 0;
      dragging = false;
      needle = { x: 300, y: 500 };
      pops = [];
      nextIn = 0;
      incision = makeIncision();
    },

    update: function (g, dt) {
      if (nextIn > 0) {
        nextIn -= dt;
        if (nextIn <= 0) incision = makeIncision();
      }
      pops.forEach(function (p) { p.life -= dt; p.y -= 25 * dt; });
      pops = pops.filter(function (p) { return p.life > 0; });
    },

    pointer: function (g, type, x, y) {
      if (type === "down") {
        dragging = true;
        needle = { x: x, y: y };
        track(g, x, y);
      } else if (type === "move" && dragging) {
        // Sample along the movement so fast drags can't skip over a dot.
        var steps = Math.ceil(Math.hypot(x - needle.x, y - needle.y) / 4) || 1;
        for (var i = 1; i <= steps; i++) {
          track(g, needle.x + (x - needle.x) * i / steps, needle.y + (y - needle.y) * i / steps);
        }
        needle = { x: x, y: y };
      } else if (type === "up") {
        if (dragging && incision && nextIn <= 0) {
          var s = incision.stitches[incision.next];
          if (s && s.minD <= HIT_R) award(g, s);
        }
        dragging = false;
      }
    },

    draw: function (g, ctx) {
      // Steel tray and green drape
      ctx.fillStyle = "#cfd8dc";
      ctx.fillRect(0, 0, g.W, g.H);
      ctx.fillStyle = "#2e7d6b";
      ctx.fillRect(10, 52, g.W - 20, g.H - 70);
      ctx.fillStyle = "#00356b";
      ctx.font = "700 16px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("Yale Simulation Center", g.W / 2, 34);

      // Practice pad
      ctx.fillStyle = "#f2c4ae";
      MiniGame.roundRect(ctx, PAD.x, PAD.y, PAD.w, PAD.h, 14);
      ctx.fill();
      ctx.strokeStyle = "rgba(160,90,70,0.12)";
      ctx.lineWidth = 1;
      for (var ly = PAD.y + 20; ly < PAD.y + PAD.h; ly += 18) {
        ctx.beginPath();
        ctx.moveTo(PAD.x + 10, ly);
        ctx.quadraticCurveTo(180, ly + 6, PAD.x + PAD.w - 10, ly);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(120,60,40,0.35)";
      ctx.font = "10px sans-serif";
      ctx.fillText("SUTURE PRACTICE PAD", g.W / 2, PAD.y + PAD.h - 10);

      if (incision && nextIn <= 0) {
        // The cut
        ctx.strokeStyle = "#a23b3b";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(incision.a.x, incision.a.y);
        ctx.quadraticCurveTo(incision.c.x, incision.c.y, incision.b.x, incision.b.y);
        ctx.stroke();

        // Thread through the stitches made so far
        var made = incision.stitches.slice(0, incision.next);
        if (made.length) {
          ctx.strokeStyle = "#1d3557";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(made[0].x, made[0].y);
          made.forEach(function (s) { ctx.lineTo(s.x, s.y); });
          if (dragging) ctx.lineTo(needle.x, needle.y);
          ctx.stroke();
        }

        incision.stitches.forEach(function (s, i) {
          var isNext = i === incision.next;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.hit ? 4 : isNext ? 7 : 5, 0, Math.PI * 2);
          ctx.fillStyle = s.hit ? "#1d3557" : isNext ? "#ffffff" : "rgba(255,255,255,0.6)";
          ctx.fill();
          if (isNext) {
            ctx.strokeStyle = "#1d3557";
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(s.x, s.y, HIT_R, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });
      }

      // Curved needle
      if (g.state === "playing") {
        ctx.strokeStyle = "#8d99a6";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(needle.x + 10, needle.y - 10, 12, Math.PI * 0.6, Math.PI * 1.6);
        ctx.stroke();
        ctx.fillStyle = "#5c6773";
        ctx.beginPath();
        ctx.arc(needle.x, needle.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      pops.forEach(function (p) { MiniGame.popText(ctx, p.text, p.x, p.y, p.life / 0.6, p.color); });
    }
  });
})();
