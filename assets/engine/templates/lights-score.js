// STARTER — copy to js/lights-score.js. Which glow group follows which musical feature / climate value.
(function () {
  MB.Glow.score = function (f, time, cl) {
    const breathe = Math.pow(1 - f.beatPhase, 2.2);
    this.set('window', cl.lights, 0.95 + 0.18 * breathe);          // lights stay off in daylight chapters
    this.set('lamp', cl.lights, 1.05 + 0.35 * f.beat);
  };
})();
