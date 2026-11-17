(function(){
  var dataEl = document.getElementById("songs-data");
  var songs = JSON.parse(dataEl.textContent);
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var index = 0;
  var stage = document.getElementById("stage-img");
  var stageDisc = document.getElementById("stage-disc");
  var nowTitle = document.getElementById("now-title");
  var barImg = document.getElementById("bar-img");
  var barTitle = document.getElementById("bar-title");
  var barLink = document.getElementById("bar-link");
  var buttons = document.querySelectorAll(".vinyl");
  var playBtn = document.getElementById("play");
  var barPlay = document.getElementById("bar-play");
  var embedBox = document.getElementById("sp-embed");
  var barLbl = document.querySelector(".nowbar .lbl");
  var audio = new Audio();
  audio.preload = "none";
  var playing = false;
  var canvasBox = document.getElementById("canvas-bg");
  var canvasVideo = document.getElementById("canvas-video");
  var canvasCur = "";

  // Spotify-Canvas-ähnliche Loops: songs[i].canvas = "video/canvas/<id>" (.webm/.mp4/.jpg)
  function setCanvas(s){
    var base = s.canvas || "";
    if (base === canvasCur) return;
    canvasCur = base;
    canvasBox.classList.remove("show");
    stageDisc.parentNode.classList.toggle("has-canvas", !!base);
    if (!base) { canvasVideo.pause(); canvasVideo.removeAttribute("src"); canvasVideo.innerHTML = ""; canvasBox.hidden = true; return; }
    canvasVideo.poster = base + ".jpg";
    canvasVideo.innerHTML = '<source src="' + base + '.webm" type="video/webm"><source src="' + base + '.mp4" type="video/mp4">';
    canvasBox.hidden = false;
    canvasVideo.load();
    if (!reduce) {
      var pr = canvasVideo.play();
      if (pr && pr.catch) pr.catch(function(){});
    }
    requestAnimationFrame(function(){ canvasBox.classList.add("show"); });
  }

  function trackId(s){
    var m = /track\/([A-Za-z0-9]+)/.exec(s.spotify);
    return m ? m[1] : "";
  }
  function setPlaying(on){
    playing = on;
    if (!reduce) stageDisc.classList.toggle("on", on);
    var lbl = on ? "Pause" : "Abspielen", sym = on ? "❚❚" : "▶";
    playBtn.textContent = sym; playBtn.setAttribute("aria-label", lbl); playBtn.setAttribute("aria-pressed", on ? "true" : "false");
    barPlay.textContent = sym; barPlay.setAttribute("aria-label", lbl);
    barLbl.textContent = on ? "Vorschau läuft" : "Aktueller Song";
  }
  audio.addEventListener("playing", function(){ setPlaying(true); });
  audio.addEventListener("pause", function(){ setPlaying(false); });
  audio.addEventListener("ended", function(){ setPlaying(false); });
  audio.addEventListener("error", function(){ if (audio.getAttribute("src")) showEmbed(); });

  // Fallback: offizieller Spotify-Player zum Antippen
  function showEmbed(){
    setPlaying(false);
    var id = trackId(songs[index]);
    if (!id) return;
    embedBox.innerHTML = '<iframe title="Spotify-Player" src="https://open.spotify.com/embed/track/' + id +
      '?utm_source=generator&theme=0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>';
    embedBox.hidden = false;
    document.body.classList.add("sp-open");
  }
  function hideEmbed(){
    if (embedBox.hidden) return;
    embedBox.hidden = true; embedBox.innerHTML = "";
    document.body.classList.remove("sp-open");
  }
  function playCurrent(){
    var s = songs[index];
    if (!s.preview) { showEmbed(); return; }
    hideEmbed();
    if (audio.getAttribute("src") !== s.preview) audio.src = s.preview;
    var pr = audio.play();
    if (pr && pr.catch) pr.catch(function(e){ if (!e || e.name !== "AbortError") showEmbed(); });
  }
  function togglePlay(){
    if (!audio.paused) { audio.pause(); return; }
    playCurrent();
  }
  function setSong(i, scrollShelf){
    if (i < 0) i = songs.length - 1;
    if (i >= songs.length) i = 0;
    index = i;
    var s = songs[i];
    stage.src = s.img;
    stage.alt = "Cover: " + s.title;
    nowTitle.textContent = s.title;
    barImg.src = s.img;
    barImg.alt = "Cover: " + s.title;
    barTitle.textContent = s.title;
    barLink.href = s.spotify;
    setCanvas(s);
    for (var b = 0; b < buttons.length; b++) {
      var on = Number(buttons[b].getAttribute("data-index")) === i;
      buttons[b].classList.toggle("on", on);
      buttons[b].setAttribute("aria-pressed", on ? "true" : "false");
    }
    if (scrollShelf) {
      var active = document.querySelector('.vinyl[data-index="' + i + '"]');
      if (active && active.scrollIntoView) {
        active.scrollIntoView({behavior: reduce ? "auto" : "smooth", inline: "center", block: "nearest"});
      }
    }
  }

  document.getElementById("prev").addEventListener("click", function(){ setSong(index - 1, true); playCurrent(); });
  document.getElementById("next").addEventListener("click", function(){ setSong(index + 1, true); playCurrent(); });
  playBtn.addEventListener("click", togglePlay);
  barPlay.addEventListener("click", togglePlay);
  for (var b = 0; b < buttons.length; b++) {
    buttons[b].addEventListener("click", function(){
      setSong(Number(this.getAttribute("data-index")), true);
      playCurrent();
    });
  }
  setSong(0, false);

  if (!reduce) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) e.target.classList.add("in");
      });
    }, {threshold: 0.12});
    document.querySelectorAll(".reveal").forEach(function(el){ io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function(el){ el.classList.add("in"); });
  }
})();
