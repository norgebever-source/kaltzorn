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

  function setSong(i){
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
    if (!reduce) stageDisc.classList.add("on");
    for (var b = 0; b < buttons.length; b++) {
      var on = Number(buttons[b].getAttribute("data-index")) === i;
      buttons[b].classList.toggle("on", on);
      buttons[b].setAttribute("aria-pressed", on ? "true" : "false");
    }
    var active = document.querySelector('.vinyl[data-index="' + i + '"]');
    if (active && active.scrollIntoView) {
      active.scrollIntoView({behavior: reduce ? "auto" : "smooth", inline: "center", block: "nearest"});
    }
  }

  document.getElementById("prev").addEventListener("click", function(){ setSong(index - 1); });
  document.getElementById("next").addEventListener("click", function(){ setSong(index + 1); });
  for (var b = 0; b < buttons.length; b++) {
    buttons[b].addEventListener("click", function(){
      setSong(Number(this.getAttribute("data-index")));
    });
  }
  setSong(0);

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
