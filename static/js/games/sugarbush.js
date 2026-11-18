// Sugarbush: the School of the Environment minigame. Five tapped maples fill
// their buckets at different speeds. Collect a bucket (tap it, or press 1-5)
// when it's nearly full; an overflowing bucket spills and scores nothing.
(function () {
  "use strict";

  var SECONDS = 45;
  var TREES = [
    { x: 70, y: 200 }, { x: 180, y: 180 }, { x: 290, y: 200 },
    { x: 120, y: 405 }, { x: 240, y: 405 }
  ];
  var BUCKET_W = 44, BUCKET_H = 46;

  var trees, pops, flakes;

  function bucketRect(tree) {
    return { x: tree.x - BUCKET_W / 2, y: tree.y + 40, w: BUCKET_W, h: BUCKET_H };
  }

  function newRate() {
    return 1 / (3.5 + Math.random() * 2.5);    // a bucket fills in 3.5-6 s at first
  }

  function collect(g, i) {
    var t = trees[i];
    if (t.wait > 0) return;
    var points = t.fill >= 0.85 ? 3 : t.fill >= 0.5 ? 2 : t.fill >= 0.2 ? 1 : 0;
    var label = points === 3 ? "Full! +3" : points ? "+" + points : "Too early";
    g.add(points);
    pops.push({ text: label, x: t.x, y: t.y + 20, life: 0.8, color: points ? "#2f5d3a" : "#8a6a3f" });
    t.fill = 0;
    t.wait = 0.4;                                // rehanging the bucket
    t.rate = newRate();
  }

  MiniGame.create({
    seconds: SECONDS,

    reset: function () {
      trees = TREES.map(function (pos) {
        return { x: pos.x, y: pos.y, fill: Math.random() * 0.4, rate: newRate(), wait: 0, spill: 0 };
      });
      pops = [];
      flakes = flakes || Array.from({ length: 40 }, function () {
        return { x: Math.random() * 360, y: Math.random() * 540, s: 0.5 + Math.random() * 1.5 };
      });
    },

    update: function (g, dt) {
      var speedUp = 1 + 0.6 * (g.time / SECONDS);  // the sap runs faster as the day warms
      trees.forEach(function (t) {
        t.spill = Math.max(0, t.spill - dt);
        if (t.wait > 0) { t.wait -= dt; return; }
        t.fill += t.rate * speedUp * dt;
        if (t.fill >= 1) {
          t.fill = 0;
          t.spill = 0.8;
          t.wait = 1;                              // mopping up costs a second
          t.rate = newRate();
          pops.push({ text: "Spilled!", x: t.x, y: t.y + 20, life: 0.9, color: "#b03a2e" });
        }
      });
      pops.forEach(function (p) { p.life -= dt; p.y -= 25 * dt; });
      pops = pops.filter(function (p) { return p.life > 0; });
    },

    pointer: function (g, type, x, y) {
      if (type !== "down") return;
      for (var i = 0; i < trees.length; i++) {
        var r = bucketRect(trees[i]);
        if (x >= r.x - 14 && x <= r.x + r.w + 14 && y >= r.y - 20 && y <= r.y + r.h + 14) {
          collect(g, i);
          return;
        }
      }
    },

    key: function (g, code, isDown) {
      var match = /^(Digit|Numpad)([1-5])$/.exec(code);
      if (!match) return false;
      if (isDown) collect(g, Number(match[2]) - 1);
      return true;
    },

    draw: function (g, ctx) {
      var t = g.time;
      // Late-winter sky, distant hills, snow
      var sky = ctx.createLinearGradient(0, 0, 0, g.H);
      sky.addColorStop(0, "#cfe3ef");
      sky.addColorStop(1, "#eef4f2");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, g.W, g.H);
      ctx.fillStyle = "#9db7a5";
      ctx.beginPath();
      ctx.moveTo(0, 120);
      ctx.quadraticCurveTo(90, 70, 180, 110);
      ctx.quadraticCurveTo(270, 140, 360, 90);
      ctx.lineTo(360, 160);
      ctx.lineTo(0, 160);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 150, g.W, g.H - 150);

      // Drifting snow
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      flakes.forEach(function (f) {
        var fy = (f.y + t * 20 * f.s) % g.H;
        ctx.beginPath();
        ctx.arc((f.x + Math.sin(t + f.y) * 6) % g.W, fy, f.s * 1.4, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = "#2f5d3a";
      ctx.font = "700 16px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("Yale-Myers Forest sugarbush", g.W / 2, 32);

      trees.forEach(function (tree, i) {
        // Trunk and bare branches
        ctx.fillStyle = "#6e5a4b";
        ctx.fillRect(tree.x - 11, tree.y - 110, 22, 160);
        ctx.strokeStyle = "#6e5a4b";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(tree.x, tree.y - 70); ctx.lineTo(tree.x - 34, tree.y - 112);
        ctx.moveTo(tree.x, tree.y - 85); ctx.lineTo(tree.x + 30, tree.y - 125);
        ctx.moveTo(tree.x, tree.y - 100); ctx.lineTo(tree.x - 12, tree.y - 130);
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(tree.x - 13, tree.y + 46, 26, 10);

        // Spout and drip
        ctx.fillStyle = "#9aa3a8";
        ctx.fillRect(tree.x - 3, tree.y + 22, 6, 14);
        if (tree.wait <= 0) {
          var dripY = tree.y + 36 + ((t * 60 + i * 13) % 14);
          ctx.fillStyle = "#c9892b";
          ctx.beginPath();
          ctx.arc(tree.x, dripY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bucket with sap level
        var r = bucketRect(tree);
        var danger = tree.fill > 0.9 && Math.floor(t * 8) % 2 === 0;
        ctx.fillStyle = danger ? "#d9534f" : "#aab4ba";
        MiniGame.roundRect(ctx, r.x, r.y, r.w, r.h, 4);
        ctx.fill();
        ctx.fillStyle = "#e3e8ea";
        ctx.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
        var level = (r.h - 8) * Math.min(1, tree.fill);
        ctx.fillStyle = tree.fill >= 0.85 ? "#b5651d" : "#d39b3c";
        ctx.fillRect(r.x + 4, r.y + 4 + (r.h - 8) - level, r.w - 8, level);
        ctx.fillStyle = "#6c757d";
        ctx.fillRect(r.x - 2, r.y - 4, r.w + 4, 5);       // lid
        ctx.fillStyle = "#4b5563";
        ctx.font = "700 12px sans-serif";
        ctx.fillText(String(i + 1), tree.x, r.y + r.h + 16);

        if (tree.spill > 0) {                            // spilled sap on the snow
          ctx.globalAlpha = tree.spill;
          ctx.fillStyle = "#d39b3c";
          ctx.beginPath();
          ctx.ellipse(tree.x, r.y + r.h + 4, 34, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      });

      pops.forEach(function (p) { MiniGame.popText(ctx, p.text, p.x, p.y, p.life / 0.8, p.color); });
    }
  });
})();
