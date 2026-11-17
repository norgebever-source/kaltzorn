(function(){
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cvs = document.getElementById("storm");
  if (!cvs || reduce) {
    if (cvs) cvs.style.display = "none";
  } else {
    var ctx = cvs.getContext("2d");
    var w, h, flakes, raf, dpr;
    var mobile = window.matchMedia("(max-width: 720px)").matches || (navigator.maxTouchPoints > 0 && window.innerWidth < 900);
    function resize(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cvs.width = Math.floor(window.innerWidth * dpr);
      h = cvs.height = Math.floor(window.innerHeight * dpr);
      cvs.style.width = window.innerWidth + "px";
      cvs.style.height = window.innerHeight + "px";
      var n = mobile ? 55 : 130;
      flakes = [];
      for (var i = 0; i < n; i++) {
        flakes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: (Math.random() * 1.7 + 0.4) * dpr,
          s: (Math.random() * 0.7 + 0.25) * dpr,
          a: Math.random() * 0.45 + 0.18,
          fog: Math.random() < 0.18
        });
      }
    }
    function tick(){
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < flakes.length; i++) {
        var p = flakes[i];
        if (p.fog) {
          ctx.fillStyle = "rgba(170,200,220," + (p.a * 0.07) + ")";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 16, 0, 6.283);
          ctx.fill();
          p.x += p.s * 0.25;
          p.y += p.s * 0.12;
        } else {
          ctx.fillStyle = "rgba(230,242,255," + p.a + ")";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, 6.283);
          ctx.fill();
          p.x += Math.sin(p.y * 0.012) * 0.45 * dpr;
          p.y += p.s * 1.7;
        }
        if (p.y > h + 12) p.y = -12;
        if (p.x > w + 12) p.x = 0;
        if (p.x < -12) p.x = w;
      }
      raf = requestAnimationFrame(tick);
    }
    window.addEventListener("resize", resize, {passive: true});
    document.addEventListener("visibilitychange", function(){
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(tick);
    });
    resize();
    tick();
  }
  var copy = document.querySelector(".hero-copy");
  if (copy && !reduce) {
    var factor = window.matchMedia("(max-width: 720px)").matches ? 0.1 : 0.22;
    window.addEventListener("scroll", function(){
      copy.style.transform = "translateY(" + (window.scrollY * factor) + "px)";
    }, {passive: true});
  }
})();
