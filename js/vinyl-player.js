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
  var controller = null, apiLoading = false, wantPlay = false, playing = false;

  function trackUri(s){
    var m = /track\/([A-Za-z0-9]+)/.exec(s.spotify);
    return m ? "spotify:track:" + m[1] : null;
  }
  function setPlaying(on){
    playing = on;
    if (!reduce) stageDisc.classList.toggle("on", on);
    var lbl = on ? "Pause" : "Abspielen", sym = on ? "❚❚" : "▶";
    playBtn.textContent = sym; playBtn.setAttribute("aria-label", lbl); playBtn.setAttribute("aria-pressed", on ? "true" : "false");
    barPlay.textContent = sym; barPlay.setAttribute("aria-label", lbl);
  }
  function loadPlayer(){
    if (controller || apiLoading) return;
    apiLoading = true;
    embedBox.hidden = false;
    document.body.classList.add("sp-open");
    window.onSpotifyIframeApiReady = function(IFrameAPI){
      IFrameAPI.createController(document.getElementById("sp-frame"),
        {uri: trackUri(songs[index]), width: "100%", height: 80},
        function(c){
          controller = c;
          c.addListener("ready", function(){ if (wantPlay) c.play(); });
          c.addListener("playback_update", function(e){
            if (e && e.data) setPlaying(!e.data.isPaused);
          });
        });
    };
    var sc = document.createElement("script");
    sc.src = "https://open.spotify.com/embed/iframe-api/v1";
    sc.async = true;
    document.body.appendChild(sc);
  }
  function playCurrent(){
    wantPlay = true;
    if (!controller) { loadPlayer(); return; }
    controller.loadUri(trackUri(songs[index]));
  }
  function togglePlay(){
    if (!controller) { playCurrent(); return; }
    if (playing) controller.pause(); else controller.resume();
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
