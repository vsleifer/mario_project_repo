// SOMchella: the SOM rhythm game. Arrows fall in four lanes in time with an
// original beat generated with Web Audio (no recorded music). Hit them on the
// line with the arrow keys or by tapping a lane. Pressing a lane with no note
// costs a point and breaks the streak, so mashing doesn't pay.
(function () {
  "use strict";

  var SECONDS = 40;
  var BPM = 120, BEAT = 60 / BPM;
  var LEAD_IN = 2;                 // seconds before the first note reaches the line
  var SPEED = 300;                 // px per second
  var TARGET_Y = 450;
  var PERFECT = 0.06, GOOD = 0.14; // hit windows, in seconds
  var LANES = [
    { code: "ArrowLeft", angle: Math.PI, color: "#e85d75" },
    { code: "ArrowDown", angle: Math.PI / 2, color: "#3fb8af" },
    { code: "ArrowUp", angle: -Math.PI / 2, color: "#f2c14e" },
    { code: "ArrowRight", angle: 0, color: "#7b6ef6" }
  ];
  var LANE_W = 66, LANES_X = (360 - LANE_W * 4) / 2;

  var notes, combo, pops, laneFlash, nextBeat, audio;

  // A fresh, playable chart each round: notes on beats and some half-beats,
  // never two notes at the same time, at most 80 in a 40-second round.
  function makeChart() {
    var chart = [], lastLane = -1;
    for (var t = LEAD_IN; t < SECONDS - 0.5; t += BEAT / 2) {
      var onBeat = Math.abs((t - LEAD_IN) / BEAT - Math.round((t - LEAD_IN) / BEAT)) < 0.01;
      var density = 0.55 + 0.35 * (t / SECONDS);
      if (Math.random() < (onBeat ? density : density * 0.35) && chart.length < 80) {
        var lane;
        do { lane = Math.floor(Math.random() * 4); } while (lane === lastLane && Math.random() < 0.6);
        lastLane = lane;
        chart.push({ t: t, lane: lane, done: false });
      }
    }
    return chart;
  }

  // --- Original beat, synthesized ---
  function ensureAudio() {
    if (audio || !window.AudioContext && !window.webkitAudioContext) return;
    audio = new (window.AudioContext || window.webkitAudioContext)();
  }

  function playDrum(kind, when) {
    if (!audio) return;
    var t = audio.currentTime + Math.max(0, when);
    var gain = audio.createGain();
    gain.connect(audio.destination);
    if (kind === "kick") {
      var osc = audio.createOscillator();
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.2);
    } else {
      var buffer = audio.createBuffer(1, audio.sampleRate * 0.05, audio.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      var noise = audio.createBufferSource();
      noise.buffer = buffer;
      var filter = audio.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = kind === "snare" ? 1500 : 7000;
      gain.gain.setValueAtTime(kind === "snare" ? 0.25 : 0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (kind === "snare" ? 0.12 : 0.04));
      noise.connect(filter);
      filter.connect(gain);
      noise.start(t);
    }
  }

  function playBass(step, when) {
    if (!audio) return;
    var notesHz = [55, 55, 65.4, 49];         // A, A, C, G: a simple original line
    var t = audio.currentTime + Math.max(0, when);
    var osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.value = notesHz[Math.floor(step / 4) % 4] * 2;
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + BEAT * 0.9);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(t);
    osc.stop(t + BEAT);
  }

  function noteY(note, g) {
    return TARGET_Y - (note.t - g.time) * SPEED;
  }

  function hit(g, lane) {
    laneFlash[lane] = 1;
    var best = null;
    notes.forEach(function (n) {
      if (!n.done && n.lane === lane && Math.abs(n.t - g.time) <= GOOD &&
          (!best || Math.abs(n.t - g.time) < Math.abs(best.t - g.time))) best = n;
    });
    if (!best) {                                   // a press with no note: breaks the streak
      combo = 0;
      g.add(-1);
      g.status("");
      pops.push({ text: "Miss", x: LANES_X + lane * LANE_W + LANE_W / 2, y: TARGET_Y - 40, life: 0.4 });
      return;
    }
    best.done = true;
    var perfect = Math.abs(best.t - g.time) <= PERFECT;
    combo += 1;
    var points = (perfect ? 2 : 1) * (combo >= 10 ? 2 : 1);
    g.add(points);
    g.status(combo >= 10 ? "Streak x2!" : (combo >= 3 ? combo + " streak" : ""));
    pops.push({ text: perfect ? "Perfect" : "Good", x: LANES_X + lane * LANE_W + LANE_W / 2, y: TARGET_Y - 40, life: 0.6 });
  }

  function drawArrow(ctx, cx, cy, angle, size, fill, stroke) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(0, -size);
    ctx.lineTo(0, -size * 0.45);
    ctx.lineTo(-size, -size * 0.45);
    ctx.lineTo(-size, size * 0.45);
    ctx.lineTo(0, size * 0.45);
    ctx.lineTo(0, size);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.restore();
  }

  MiniGame.create({
    seconds: SECONDS,

    reset: function (g, starting) {
      notes = makeChart();
      combo = 0;
      pops = [];
      laneFlash = [0, 0, 0, 0];
      nextBeat = 0;
      if (starting) {
        ensureAudio();
        if (audio && audio.state === "suspended") audio.resume();
      }
    },

    update: function (g, dt) {
      // Schedule the beat slightly ahead of time; the beat is aligned with the notes.
      while (nextBeat * (BEAT / 2) <= g.time + 0.1) {
        var at = nextBeat * (BEAT / 2) - g.time;
        if (!g.muted() && audio) {
          var step = nextBeat;
          if (step % 2 === 0) playDrum((step / 2) % 2 === 0 ? "kick" : "snare", at);
          playDrum("hat", at);
          if (step % 2 === 0) playBass(step / 2, at);
        }
        nextBeat += 1;
      }
      notes.forEach(function (n) {
        if (!n.done && g.time - n.t > GOOD) {
          n.done = true;
          n.missed = true;
          combo = 0;
          g.status("");
        }
      });
      pops.forEach(function (p) { p.life -= dt; p.y -= 30 * dt; });
      pops = pops.filter(function (p) { return p.life > 0; });
      laneFlash = laneFlash.map(function (f) { return Math.max(0, f - dt * 5); });
      if (notes.every(function (n) { return n.done; }) && g.time > LEAD_IN) g.end();
    },

    key: function (g, code, isDown) {
      for (var i = 0; i < LANES.length; i++) {
        if (LANES[i].code === code) {
          if (isDown) hit(g, i);
          return true;
        }
      }
      return false;
    },

    pointer: function (g, type, x) {
      if (type !== "down") return;
      var lane = Math.floor((x - LANES_X) / LANE_W);
      if (lane >= 0 && lane < 4) hit(g, lane);
    },

    draw: function (g, ctx) {
      // Night sky and stage
      var sky = ctx.createLinearGradient(0, 0, 0, g.H);
      sky.addColorStop(0, "#1b1035");
      sky.addColorStop(1, "#3d1d4f");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, g.W, g.H);

      // Sweeping stage lights
      var sweep = Math.sin(g.time * 1.5) * 0.5;
      [[60, "#e85d75"], [300, "#3fb8af"]].forEach(function (light, i) {
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = light[1];
        ctx.translate(light[0], 0);
        ctx.rotate((i ? -1 : 1) * (0.25 + sweep * 0.4));
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.lineTo(90, 520);
        ctx.lineTo(-90, 520);
        ctx.fill();
        ctx.restore();
      });

      // Banner
      ctx.fillStyle = "#f2c14e";
      ctx.font = "700 30px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("SOMCHELLA", g.W / 2, 44);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "12px sans-serif";
      ctx.fillText("EVANS HALL MAIN STAGE", g.W / 2, 62);

      // Lanes
      for (var i = 0; i < 4; i++) {
        var lx = LANES_X + i * LANE_W;
        ctx.fillStyle = "rgba(255,255,255," + (0.04 + laneFlash[i] * 0.15) + ")";
        ctx.fillRect(lx + 3, 80, LANE_W - 6, g.H - 80);
        drawArrow(ctx, lx + LANE_W / 2, TARGET_Y, LANES[i].angle, 22, null,
          laneFlash[i] > 0 ? "#ffffff" : "rgba(255,255,255,0.45)");
      }
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(LANES_X, TARGET_Y - 1, LANE_W * 4, 2);

      // Notes
      if (notes) {
        notes.forEach(function (n) {
          if (n.done && !n.missed) return;
          var y = noteY(n, g);
          if (y < 60 || y > g.H + 30) return;
          ctx.globalAlpha = n.missed ? 0.25 : 1;
          drawArrow(ctx, LANES_X + n.lane * LANE_W + LANE_W / 2, y, LANES[n.lane].angle, 20, LANES[n.lane].color, "#ffffff");
          ctx.globalAlpha = 1;
        });
      }

      // Crowd silhouettes
      ctx.fillStyle = "#120a24";
      for (var c = 0; c < 12; c++) {
        var bob = g.state === "playing" ? Math.abs(Math.sin(g.time * Math.PI * 2 / BEAT / 2 + c)) * 6 : 0;
        var cx = c * 32 + 10;
        ctx.beginPath();
        ctx.arc(cx, g.H - 34 - bob, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 14, g.H - 24 - bob, 28, 30);
      }

      (pops || []).forEach(function (p) { MiniGame.popText(ctx, p.text, p.x, p.y, p.life / 0.6, "#ffffff"); });
    }
  });
})();
