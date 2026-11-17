(function(){
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canTilt = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduce;
  if (!canTilt) return;
  var cards = document.querySelectorAll(".song");
  for (var i = 0; i < cards.length; i++) {
    (function(card){
      card.addEventListener("pointermove", function(e){
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = "rotateY(" + (x * 14) + "deg) rotateX(" + (-y * 12) + "deg) translateY(-4px) scale(1.03)";
      });
      card.addEventListener("pointerleave", function(){
        card.style.transform = "";
      });
    })(cards[i]);
  }
})();
