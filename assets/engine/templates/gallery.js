// STARTER — copy to js/gallery.js. Register every landmark here and approve it on the turntable
// (?gallery=name&az=0.6&el=0.4&lights=1) BEFORE placing it on the planet.
(function () {
  const K = MB.Kit, raw = geo => new THREE.Mesh(geo, K.LAMBERT);
  MB.Gallery = {
    tree: () => { const t = K.makeTree(1), g = new THREE.Group(); g.add(raw(t.trunk), raw(t.crown)); return g; },
  };
})();
