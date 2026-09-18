(function () {
  const CFG = MB.CONFIG;

  class Controls {
    constructor(camera, dom, world) {
      this.camera = camera;
      this.dom = dom;
      this.world = world;
      this.theta = 0;
      this.phi = 1.22;
      this.dist = CFG.CAMERA_START;
      this.tTheta = this.theta;
      this.tPhi = this.phi;
      this.tDist = this.dist;
      this.vTheta = 0;
      this.vPhi = 0;
      this.dragging = false;
      this.moved = 0;
      this.follow = null;
      this.camPos = new THREE.Vector3();
      this.lookPt = new THREE.Vector3();
      this.upVec = new THREE.Vector3(0, 1, 0);
      this.desired = new THREE.Vector3();
      this.desiredLook = new THREE.Vector3();
      this.desiredUp = new THREE.Vector3();
      this.raycaster = new THREE.Raycaster();
      this.onPick = null;
      this.spherical(this.camPos, this.dist, this.phi, this.theta);
      this.bind();
    }

    spherical(out, d, phi, theta) {
      return out.set(d * Math.sin(phi) * Math.sin(theta), d * Math.cos(phi), d * Math.sin(phi) * Math.cos(theta));
    }

    bind() {
      const dom = this.dom;
      dom.style.touchAction = "none";
      dom.addEventListener("pointerdown", e => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        this.dragging = true; this.moved = 0; this.lastX = e.clientX; this.lastY = e.clientY;
        this.vTheta = 0; this.vPhi = 0; dom.setPointerCapture(e.pointerId);
      });
      dom.addEventListener("pointermove", e => {
        if (!this.dragging) return;
        const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
        this.lastX = e.clientX; this.lastY = e.clientY; this.moved += Math.abs(dx) + Math.abs(dy);
        if (this.follow && this.moved > 8) this.endFollow();
        const k = .0046 * Math.min(1.6, this.dist / 650 + .25);
        this.tTheta -= dx * k; this.tPhi -= dy * k;
        this.vTheta = -dx * k; this.vPhi = -dy * k;
        this.tPhi = THREE.MathUtils.clamp(this.tPhi, .08, Math.PI - .08);
      });
      const end = e => {
        if (!this.dragging) return;
        this.dragging = false;
        if (this.moved < 6) this.click(e.clientX, e.clientY);
      };
      dom.addEventListener("pointerup", end);
      dom.addEventListener("pointercancel", end);
      dom.addEventListener("wheel", e => {
        e.preventDefault();
        this.tDist = THREE.MathUtils.clamp(
          this.tDist * Math.exp(THREE.MathUtils.clamp(e.deltaY, -120, 120) * .00125),
          CFG.CAMERA_MIN, CFG.CAMERA_MAX
        );
        if (this.follow) this.endFollow();
      }, { passive: false });
      window.addEventListener("keydown", e => { if (e.key === "Escape") this.endFollow(); });
    }

    click(x, y) {
      const rect = this.dom.getBoundingClientRect();
      const pointer = new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, -((y - rect.top) / rect.height * 2 - 1));
      this.raycaster.setFromCamera(pointer, this.camera);
      const target = this.world.pick(this.raycaster);
      if (target) {
        this.follow = { target, time: 0, duration: 14 };
        if (this.onPick) this.onPick(target, true);
      }
    }

    // 从 UI 的地标列表飞过去
    flyTo(target) { if (!target) return; this.follow = { target, time: 0, duration: 16 }; if (this.onPick) this.onPick(target, true); }

    endFollow() {
      if (!this.follow) return;
      const p = this.camPos;
      const d = THREE.MathUtils.clamp(p.length(), CFG.CAMERA_MIN, CFG.CAMERA_MAX);
      this.tDist = this.dist = d;
      this.tPhi = this.phi = Math.acos(THREE.MathUtils.clamp(p.y / d, -1, 1));
      this.tTheta = this.theta = Math.atan2(p.x, p.z);
      this.follow = null;
      if (this.onPick) this.onPick(null, false);
    }

    update(dt) {
      if (!this.dragging) {
        this.tTheta += this.vTheta * 60 * dt * .35;
        this.tPhi += this.vPhi * 60 * dt * .35;
        this.vTheta *= Math.exp(-dt * 4);
        this.vPhi *= Math.exp(-dt * 4);
      }
      this.theta += (this.tTheta - this.theta) * (1 - Math.exp(-dt * 8));
      this.phi += (this.tPhi - this.phi) * (1 - Math.exp(-dt * 8));
      this.dist += (this.tDist - this.dist) * (1 - Math.exp(-dt * 5));

      if (this.follow) {
        this.follow.time += dt;
        this.world.getFocusPose(this.follow.target, _target, _forward, _up);
        const k = this.follow.target.dist || 1;
        this.desired.copy(_target).addScaledVector(_forward, -36 * k).addScaledVector(_up, 30 * k);
        this.desiredLook.copy(_target).addScaledVector(_up, 6 * k);
        this.desiredUp.copy(_up);
        if (this.follow.time > this.follow.duration) this.endFollow();
      } else {
        this.spherical(this.desired, this.dist, this.phi, this.theta);
        const close = 1 - THREE.MathUtils.smoothstep(this.dist, CFG.R + 25, CFG.R + 210);
        _up.copy(this.desired).normalize();
        _forward.set(Math.cos(this.phi) * Math.sin(this.theta), -Math.sin(this.phi), Math.cos(this.phi) * Math.cos(this.theta)).negate();
        this.desiredLook.copy(_up).multiplyScalar(CFG.R * .86 * close).addScaledVector(_forward, CFG.R * .28 * close);
        this.desiredUp.set(0, 1, 0).lerp(_up, close).normalize();
      }

      const snap = this.snapFrames > 0; if (snap) this.snapFrames--;
      this.camPos.lerp(this.desired, snap ? 1 : 1 - Math.exp(-dt * (this.follow ? 3.5 : 9)));
      this.lookPt.lerp(this.desiredLook, snap ? 1 : 1 - Math.exp(-dt * 4.5));
      this.upVec.lerp(this.desiredUp, snap ? 1 : 1 - Math.exp(-dt * 4)).normalize();
      this.camera.position.copy(this.camPos);
      this.camera.up.copy(this.upVec);
      this.camera.lookAt(this.lookPt);
    }
  }

  const _target = new THREE.Vector3();
  const _forward = new THREE.Vector3();
  const _up = new THREE.Vector3();
  MB.Controls = Controls;
})();
