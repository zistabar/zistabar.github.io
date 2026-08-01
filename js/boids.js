/**
 * Boids (Reynolds, 1986) rendered on a full-page canvas.
 *
 * Each agent follows three local rules — separation, alignment, cohesion —
 * plus an optional repulsion from the cursor. No global choreography.
 */
(function (global) {
  'use strict';

  var DEFAULTS = {
    count: 90,          // number of agents
    size: 5,            // triangle length in px
    speed: 0.6,         // baseline speed in px/frame
    neighbourRadius: 58,
    separationRadius: 20,
    fleeRadius: 110,    // cursor repulsion range
    fleeCursor: true,
    opacityFollowsCss: true
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
    var frame = 0;
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

    function resize() {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      var first = width === 0;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      color = global.getComputedStyle(canvas).color || color;

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

    function steer(boid, index) {
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
        boid.vx += (centreX / neighbours - boid.x) * 0.0009 +
                   (headingX / neighbours - boid.vx) * 0.045 +
                   pushX * 0.9;
        boid.vy += (centreY / neighbours - boid.y) * 0.0009 +
                   (headingY / neighbours - boid.vy) * 0.045 +
                   pushY * 0.9;
      }

      if (opts.fleeCursor) {
        var mx = boid.x - mouse.x;
        var my = boid.y - mouse.y;
        var mSq = mx * mx + my * my;
        if (mSq < opts.fleeRadius * opts.fleeRadius && mSq > 0.001) {
          var m = Math.sqrt(mSq);
          var force = (1 - m / opts.fleeRadius) * 0.75;
          boid.vx += (mx / m) * force;
          boid.vy += (my / m) * force;
        }
      }

      // a little noise keeps the flock from settling into a lattice
      boid.vx += (Math.random() - 0.5) * 0.02;
      boid.vy += (Math.random() - 0.5) * 0.02;

      var speed = Math.hypot(boid.vx, boid.vy) || 1;
      var clamped = Math.max(minSpeed, Math.min(maxSpeed, speed));
      boid.vx = (boid.vx / speed) * clamped;
      boid.vy = (boid.vy / speed) * clamped;

      boid.x += boid.vx;
      boid.y += boid.vy;

      // wrap around the edges
      if (boid.x < -8) boid.x = width + 8;
      else if (boid.x > width + 8) boid.x = -8;
      if (boid.y < -8) boid.y = height + 8;
      else if (boid.y > height + 8) boid.y = -8;
    }

    function drawTriangle(boid) {
      var angle = Math.atan2(boid.vy, boid.vx);
      var cos = Math.cos(angle);
      var sin = Math.sin(angle);
      var s = opts.size;

      ctx.beginPath();
      ctx.moveTo(boid.x + cos * s, boid.y + sin * s);
      ctx.lineTo(boid.x - cos * s * 0.75 - sin * s * 0.5, boid.y - sin * s * 0.75 + cos * s * 0.5);
      ctx.lineTo(boid.x - cos * s * 0.75 + sin * s * 0.5, boid.y - sin * s * 0.75 - cos * s * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    function tick() {
      rafId = global.requestAnimationFrame(tick);
      if (!width) return;

      // re-read the CSS colour occasionally so theme switches are picked up
      if (frame++ % 60 === 0) color = global.getComputedStyle(canvas).color || color;

      for (var i = 0; i < boids.length; i++) steer(boids[i], i);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      for (var k = 0; k < boids.length; k++) drawTriangle(boids[k]);
    }

    resize();
    var observer = new ResizeObserver(resize);
    observer.observe(canvas);
    global.addEventListener('mousemove', onPointerMove, { passive: true });
    global.addEventListener('mouseout', onPointerOut, { passive: true });
    tick();

    return function stop() {
      global.cancelAnimationFrame(rafId);
      observer.disconnect();
      global.removeEventListener('mousemove', onPointerMove);
      global.removeEventListener('mouseout', onPointerOut);
    };
  }

  global.startBoids = startBoids;
})(window);
