/**
 * Boids (Reynolds, 1986) rendered on a full-page canvas.
 *
 * Each agent follows three local rules — separation, alignment, cohesion —
 * plus an optional repulsion from the cursor. No global choreography.
 */
(function (global) {
  'use strict';

  // Motion is integrated in steps of this length, so a slow or fast display
  // changes the smoothness but never the speed.
  var FRAME_MS = 1000 / 60;
  var MAX_STEP = 3; // ignore longer gaps (background tab, blocked main thread)

  var DEFAULTS = {
    count: 90,          // number of agents
    size: 5,            // triangle length in px
    speed: 0.6,         // baseline speed in px per 1/60s
    neighbourRadius: 58,
    separationRadius: 20,
    fleeRadius: 110,    // cursor repulsion range
    fleeCursor: true,
    // Quiet zone: the flock stays faint over the text column and reaches full
    // strength in the right margin. Drawn per agent rather than masked in CSS,
    // which costs a composite pass on every frame.
    quietAlpha: 0.16,   // alpha multiplier over the column
    quietUntil: 700,    // px from the left edge: faint up to here
    quietFrom: 1000,    // px from the left edge: full strength from here
    quietMinWidth: 721  // narrower than this the text is full-width, so skip it
  };

  function startBoids(canvas, options) {
    var opts = Object.assign({}, DEFAULTS, options || {});
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var width = 0;
    var height = 0;
    var color = '#000';
    var boids = [];
    var mouse = { x: -1e4, y: -1e4 };
    var maxSpeed = opts.speed * 1.6;
    var minSpeed = opts.speed * 0.55;
    var lastTime = 0;
    var rafId = null;

    function seed() {
      boids = [];
      for (var i = 0; i < opts.count; i++) {
        var angle = Math.random() * Math.PI * 2;
        boids.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * opts.speed,
          vy: Math.sin(angle) * opts.speed
        });
      }
    }

    function readColour() {
      color = global.getComputedStyle(canvas).color || color;
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      var first = width === 0;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      readColour();

      if (first) seed();
    }

    function onPointerMove(event) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    }

    function onPointerOut() {
      mouse.x = -1e4;
      mouse.y = -1e4;
    }

    function steer(boid, index, step) {
      var centreX = 0, centreY = 0;
      var headingX = 0, headingY = 0;
      var pushX = 0, pushY = 0;
      var neighbours = 0;

      for (var j = 0; j < boids.length; j++) {
        if (j === index) continue;

        var other = boids[j];
        var dx = other.x - boid.x;
        var dy = other.y - boid.y;
        var distSq = dx * dx + dy * dy;
        if (distSq > opts.neighbourRadius * opts.neighbourRadius) continue;

        neighbours++;
        centreX += other.x;
        centreY += other.y;
        headingX += other.vx;
        headingY += other.vy;

        if (distSq < opts.separationRadius * opts.separationRadius && distSq > 0.001) {
          var dist = Math.sqrt(distSq);
          pushX -= (dx / dist / dist) * 6;
          pushY -= (dy / dist / dist) * 6;
        }
      }

      if (neighbours) {
        // cohesion + alignment + separation
        boid.vx += ((centreX / neighbours - boid.x) * 0.0009 +
                    (headingX / neighbours - boid.vx) * 0.045 +
                    pushX * 0.9) * step;
        boid.vy += ((centreY / neighbours - boid.y) * 0.0009 +
                    (headingY / neighbours - boid.vy) * 0.045 +
                    pushY * 0.9) * step;
      }

      if (opts.fleeCursor) {
        var mx = boid.x - mouse.x;
        var my = boid.y - mouse.y;
        var mSq = mx * mx + my * my;
        if (mSq < opts.fleeRadius * opts.fleeRadius && mSq > 0.001) {
          var m = Math.sqrt(mSq);
          var force = (1 - m / opts.fleeRadius) * 0.75 * step;
          boid.vx += (mx / m) * force;
          boid.vy += (my / m) * force;
        }
      }

      // a little noise keeps the flock from settling into a lattice
      boid.vx += (Math.random() - 0.5) * 0.02 * step;
      boid.vy += (Math.random() - 0.5) * 0.02 * step;

      var speed = Math.hypot(boid.vx, boid.vy) || 1;
      var clamped = Math.max(minSpeed, Math.min(maxSpeed, speed));
      boid.vx = (boid.vx / speed) * clamped;
      boid.vy = (boid.vy / speed) * clamped;

      boid.x += boid.vx * step;
      boid.y += boid.vy * step;

      // wrap around the edges
      if (boid.x < -8) boid.x = width + 8;
      else if (boid.x > width + 8) boid.x = -8;
      if (boid.y < -8) boid.y = height + 8;
      else if (boid.y > height + 8) boid.y = -8;
    }

    // Faint over the text column on the left, full strength in the right margin.
    function fadeAt(x) {
      if (width < opts.quietMinWidth) return 1; // narrow layouts dim the whole canvas in CSS
      if (x <= opts.quietUntil) return opts.quietAlpha;
      if (x >= opts.quietFrom) return 1;
      var t = (x - opts.quietUntil) / (opts.quietFrom - opts.quietUntil);
      return opts.quietAlpha + (1 - opts.quietAlpha) * t;
    }

    function drawTriangle(boid) {
      var angle = Math.atan2(boid.vy, boid.vx);
      var cos = Math.cos(angle);
      var sin = Math.sin(angle);
      var s = opts.size;

      ctx.globalAlpha = fadeAt(boid.x);
      ctx.beginPath();
      ctx.moveTo(boid.x + cos * s, boid.y + sin * s);
      ctx.lineTo(boid.x - cos * s * 0.75 - sin * s * 0.5, boid.y - sin * s * 0.75 + cos * s * 0.5);
      ctx.lineTo(boid.x - cos * s * 0.75 + sin * s * 0.5, boid.y - sin * s * 0.75 - cos * s * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    function tick(now) {
      rafId = global.requestAnimationFrame(tick);
      if (!width) return;

      // Scale the step by how long the frame actually took, so the flock moves
      // at the same speed whatever the display refresh rate.
      var step = lastTime ? Math.min((now - lastTime) / FRAME_MS, MAX_STEP) : 1;
      lastTime = now || 0; // the first call comes from us, without a timestamp

      for (var i = 0; i < boids.length; i++) steer(boids[i], i, step);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      for (var k = 0; k < boids.length; k++) drawTriangle(boids[k]);
      ctx.globalAlpha = 1;
    }

    resize();
    var observer = new ResizeObserver(resize);
    observer.observe(canvas);
    // Pick the colour up when the theme changes, rather than polling for it
    // inside the animation loop.
    var themeObserver = new MutationObserver(readColour);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class']
    });
    global.addEventListener('mousemove', onPointerMove, { passive: true });
    global.addEventListener('mouseout', onPointerOut, { passive: true });
    tick();

    return function stop() {
      global.cancelAnimationFrame(rafId);
      observer.disconnect();
      themeObserver.disconnect();
      global.removeEventListener('mousemove', onPointerMove);
      global.removeEventListener('mouseout', onPointerOut);
    };
  }

  global.startBoids = startBoids;
})(window);
