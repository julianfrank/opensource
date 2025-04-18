(function(){"use strict";try{if(typeof document<"u"){var e=document.createElement("style");e.appendChild(document.createTextNode(".mic-widget{position:relative;height:fit-content;width:fit-content;min-width:4rem;min-height:2rem;margin:0%;padding:0%;display:flex;flex-direction:row;align-items:center;justify-content:flex-start}.mic-controls{display:flex;align-items:center;width:100%}.waveform-container{position:absolute;top:100%;left:0;width:100%;margin-top:.5rem;padding:.5rem;background-color:#0000001a;border-radius:.25rem;box-shadow:inset 0 0 .5rem #0003;transition:opacity 1s ease-in-out;opacity:1;z-index:1000;pointer-events:auto;visibility:visible;display:block}.waveform-container.hidden{opacity:0;pointer-events:none;visibility:hidden;display:none}.waveform-canvas{display:block;background-color:#000;border-radius:.25rem;width:100%;height:auto;image-rendering:pixelated}.mic-settings-container{position:relative;display:flex;align-items:center}.settings-button{margin:.2rem;padding:0;height:1.5rem;width:1.5rem;line-height:1.5rem;text-align:center;display:inline-block;box-shadow:0 0 .5rem #00000080;transition:box-shadow .3s ease;background-color:transparent;border-radius:.25rem;cursor:pointer;-webkit-user-select:none;user-select:none}.settings-button:hover{box-shadow:inset 0 0 .5rem #00000080}.mic-list{position:absolute;top:100%;left:0;z-index:1000;background-color:#fff;border:1px solid #ccc;border-radius:.25rem;box-shadow:0 2px 4px #0003;margin-top:.2rem}.mic-list-hidden{display:none}.start-button,.stop-button{margin:.2rem;padding:0;height:1.5rem;min-width:1.5rem;line-height:1.5rem;text-align:center;display:inline-block;box-shadow:0 0 .5rem #00000080;transition:box-shadow .3s ease;background-color:transparent;border-radius:.25rem;cursor:pointer;-webkit-user-select:none;user-select:none}.stop-button{display:none}.start-button:hover,.stop-button:hover{box-shadow:inset 0 0 .5rem #00000080}")),document.head.appendChild(e)}}catch(t){console.error("vite-plugin-css-injected-by-js",t)}})();
var S = Object.defineProperty;
var F = (g, e, t) => e in g ? S(g, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : g[e] = t;
var r = (g, e, t) => F(g, typeof e != "symbol" ? e + "" : e, t);
class x extends Error {
  constructor(e) {
    super(e), this.name = "MicManagerError";
  }
}
class T extends x {
  constructor(e) {
    super(e), this.name = "StreamError";
  }
}
class b extends x {
  constructor(e) {
    super(e), this.name = "DeviceError";
  }
}
const E = class E {
  constructor(e) {
    r(this, "stream", null);
    r(this, "rootElement");
    r(this, "elements", null);
    r(this, "startButton", null);
    r(this, "stopButton", null);
    r(this, "streamTarget", null);
    r(this, "useDefaultAudioElement", !0);
    r(this, "eventListeners", /* @__PURE__ */ new Map());
    r(this, "micListCache", null);
    r(this, "micListCacheTimestamp", 0);
    r(this, "MIC_LIST_CACHE_DURATION", 5e3);
    // Cache duration in milliseconds
    // Waveform visualization properties
    r(this, "audioContext", null);
    r(this, "analyser", null);
    r(this, "waveformConfig", {
      enabled: !0,
      width: 64,
      height: 32,
      resolution: 32,
      refreshRate: 1,
      backgroundColor: "#000000",
      waveformColor: "#00ff00"
    });
    r(this, "animationFrameId", null);
    r(this, "updateWaveformPosition", () => {
      var e, t;
      if ((e = this.elements) != null && e.waveformContainer && ((t = this.elements) != null && t.micWidget)) {
        const i = this.elements.micWidget.getBoundingClientRect();
        this.elements.waveformContainer.style.left = `${i.left}px`, this.elements.waveformContainer.style.top = `${i.bottom + 8}px`;
      }
    });
    if (E._instanceCreated)
      throw new x("MicManager instance already created");
    E._instanceCreated = !0, this.rootElement = (e == null ? void 0 : e.rootElement) || document.body, e.streamTarget && this.setStreamTarget(e.streamTarget), console.log("Mic Manager	Version: 2025.4.18	Author: Julian Frank");
  }
  /**
   * Safely adds an event listener and stores it for cleanup
   * @param element The DOM element to attach the listener to
   * @param type Event type
   * @param listener Event listener function
   */
  addEventListenerWithCleanup(e, t, i) {
    var s;
    e.addEventListener(t, i), this.eventListeners.has(e) || this.eventListeners.set(e, []), (s = this.eventListeners.get(e)) == null || s.push({ type: t, listener: i });
  }
  /**
   * Removes all event listeners from an element
   * @param element The DOM element to clean up
   */
  removeEventListeners(e) {
    const t = this.eventListeners.get(e);
    t && (t.forEach(({ type: i, listener: s }) => {
      e.removeEventListener(i, s);
    }), this.eventListeners.delete(e));
  }
  /**
   * Sets a custom stream target for audio output
   * @param target The stream target implementation
   */
  setStreamTarget(e) {
    this.stream && this.stopRecording(), this.streamTarget = e, this.useDefaultAudioElement = !1, this.elements && (this.elements.audioElement.style.display = "none");
  }
  /**
   * Removes the custom stream target and reverts to using the default audio element
   */
  clearStreamTarget() {
    this.stream && this.stopRecording(), this.streamTarget = null, this.useDefaultAudioElement = !0, this.elements && (this.elements.audioElement.style.display = "block");
  }
  /**
   * Gets the list of available microphones, using cache when possible
   * @returns Promise<Microphone[]>
   */
  async getMicrophoneList() {
    const e = Date.now();
    if (this.micListCache && e - this.micListCacheTimestamp < this.MIC_LIST_CACHE_DURATION)
      return this.micListCache;
    if (!navigator.mediaDevices)
      throw new b("MediaDevices API not supported");
    try {
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: !0,
          noiseSuppression: !0,
          autoGainControl: !0
        }
      });
      const i = (await navigator.mediaDevices.enumerateDevices()).filter((s) => s.kind === "audioinput").map((s) => ({
        deviceId: s.deviceId,
        label: s.label || `Microphone (${s.deviceId})`
      }));
      return this.micListCache = i, this.micListCacheTimestamp = e, i;
    } catch (t) {
      throw console.error("Error getting microphone list:", t), t instanceof Error ? new b(t.message) : new b("Failed to get microphone list");
    }
  }
  updateMicList(e, t) {
    for (; e.firstChild; )
      e.removeChild(e.firstChild);
    const i = document.createDocumentFragment();
    t.forEach((s) => {
      const n = document.createElement("option");
      n.value = s.deviceId, n.text = s.label, i.appendChild(n);
    }), e.appendChild(i);
  }
  createMicUI(e) {
    const {
      rootElement: t = this.rootElement,
      startButtonText: i = "🎙️",
      stopButtonText: s = "🛑",
      onStartRecording: n,
      onStopRecording: c,
      onAudioElementError: h,
      streamTarget: l,
      waveform: o
    } = e;
    l && this.setStreamTarget(l), o && (this.waveformConfig = {
      ...this.waveformConfig,
      ...o
    });
    const a = document.createElement("div");
    a.classList.add("mic-widget"), t.appendChild(a);
    const C = document.createElement("div");
    C.classList.add("mic-settings-container"), a.appendChild(C);
    const p = document.createElement("div");
    p.classList.add("settings-button"), p.textContent = "⚙️", p.setAttribute("role", "button"), p.setAttribute("tabindex", "0"), C.appendChild(p);
    const w = document.createElement("select");
    w.classList.add("mic-list"), w.classList.add("mic-list-hidden"), C.appendChild(w), this.addEventListenerWithCleanup(p, "click", () => {
      w.classList.toggle("mic-list-hidden");
    });
    const m = document.createElement("div");
    m.classList.add("start-button"), m.textContent = i, m.setAttribute("role", "button"), m.setAttribute("tabindex", "0"), a.appendChild(m), this.startButton = m;
    const f = document.createElement("div");
    f.classList.add("stop-button"), f.textContent = s, f.setAttribute("role", "button"), f.setAttribute("tabindex", "0"), a.appendChild(f), this.stopButton = f;
    const L = document.createElement("audio");
    L.classList.add("audio-element"), this.useDefaultAudioElement || (L.style.display = "none"), a.appendChild(L);
    let u, d;
    return this.waveformConfig.enabled && (d = document.createElement("div"), d.classList.add("waveform-container", "hidden"), t.appendChild(d), d.style.position = "absolute", d.style.width = `${this.waveformConfig.width || 300}px`, d.style.display = "block", d.style.visibility = "visible", u = document.createElement("canvas"), u.classList.add("waveform-canvas"), u.width = this.waveformConfig.width || 300, u.height = this.waveformConfig.height || 150, u.style.display = "block", d.appendChild(u), d.offsetHeight, this.updateWaveformPosition(), window.addEventListener("resize", this.updateWaveformPosition), console.log("Waveform container created:", {
      width: u.width,
      height: u.height,
      containerWidth: d.style.width
    })), this.addEventListenerWithCleanup(
      w,
      "change",
      this.handleMicChange.bind(this)
    ), this.addEventListenerWithCleanup(m, "click", async () => {
      try {
        await this.startRecording(w.value), n == null || n(this.stream), this.waveformConfig.enabled && this.stream && this.setupWaveform(this.stream), m.style.display = "none", f.style.display = "block";
      } catch (v) {
        console.error("Error starting recording:", v);
        const y = v instanceof Error ? new T(v.message) : new T("Failed to start recording");
        h == null || h(y);
      }
    }), this.addEventListenerWithCleanup(f, "click", () => {
      this.stopRecording(), c == null || c(), m.style.display = "block", f.style.display = "none";
    }), this.getMicrophoneList().then((v) => {
      var y;
      this.updateMicList(w, v), (y = e.onMicListChange) == null || y.call(e, v);
    }).catch((v) => {
      var A;
      const y = v instanceof Error ? new b(v.message) : new b("Failed to initialize microphone list");
      (A = e.onAudioElementError) == null || A.call(e, y);
    }), this.elements = {
      micWidget: a,
      micSettingsContainer: C,
      settingsButton: p,
      micList: w,
      startButton: m,
      stopButton: f,
      audioElement: L,
      waveformCanvas: u,
      waveformContainer: d
    }, this.elements;
  }
  async handleMicChange() {
    this.stream && (this.stopRecording(), this.startButton && this.stopButton && (this.startButton.style.display = "block", this.stopButton.style.display = "none"));
  }
  async startRecording(e) {
    var i, s, n, c, h, l;
    this.stream && this.stopRecording();
    const t = {
      audio: {
        deviceId: e ? { exact: e } : void 0,
        echoCancellation: !0,
        noiseSuppression: !0,
        autoGainControl: !0
      }
    };
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(
        t
      ), this.stream && (this.streamTarget ? (this.streamTarget.setStream(this.stream), (s = (i = this.streamTarget).start) == null || s.call(i), (c = (n = this.streamTarget).onStreamStart) == null || c.call(n)) : this.useDefaultAudioElement && this.elements && (this.elements.audioElement.srcObject = this.stream, await this.elements.audioElement.play()));
    } catch (o) {
      console.error("Error starting recording:", o);
      const a = o instanceof Error ? new T(o.message) : new T("Failed to start recording");
      throw this.streamTarget && ((l = (h = this.streamTarget).onStreamError) == null || l.call(h, a)), a;
    }
  }
  stopRecording() {
    var e, t, i, s;
    if (this.stream)
      try {
        this.stopWaveform(), this.stream.getTracks().forEach((n) => {
          try {
            n.stop();
          } catch (c) {
            console.warn("Error stopping track:", c);
          }
        }), this.streamTarget ? (this.streamTarget.setStream(null), (t = (e = this.streamTarget).stop) == null || t.call(e), (s = (i = this.streamTarget).onStreamStop) == null || s.call(i)) : this.elements && (this.elements.audioElement.srcObject = null);
      } catch (n) {
        console.error("Error in stopRecording:", n);
      } finally {
        this.stream = null;
      }
  }
  setupWaveform(e) {
    var t, i;
    if (!this.waveformConfig.enabled) {
      console.log("Waveform visualization is disabled");
      return;
    }
    if (!((t = this.elements) != null && t.waveformCanvas) || !((i = this.elements) != null && i.waveformContainer)) {
      console.error("Waveform elements not found");
      return;
    }
    try {
      this.elements.waveformContainer.classList.remove("hidden"), this.elements.waveformContainer.style.display = "block", this.elements.waveformContainer.style.visibility = "visible", this.elements.waveformContainer.offsetHeight, this.audioContext || (this.audioContext = new AudioContext(), console.log("Created new AudioContext"));
      try {
        this.analyser = this.audioContext.createAnalyser(), this.analyser.fftSize = this.waveformConfig.resolution * 2, console.log(
          "Analyzer created with fftSize:",
          this.analyser.fftSize
        );
      } catch (s) {
        console.error("Failed to create analyzer:", s);
        return;
      }
      try {
        this.audioContext.createMediaStreamSource(
          e
        ).connect(this.analyser), console.log("Stream connected to analyzer");
      } catch (s) {
        console.error("Failed to connect stream to analyzer:", s);
        return;
      }
      this.updateWaveformPosition(), console.log("Starting waveform animation"), this.drawWaveform();
    } catch (s) {
      console.error("Error in setupWaveform:", s);
    }
  }
  drawWaveform() {
    var c;
    if (!this.waveformConfig.enabled) {
      console.log("Waveform visualization is disabled");
      return;
    }
    if (!this.analyser || !((c = this.elements) != null && c.waveformCanvas)) {
      console.error("Missing analyser or canvas element");
      return;
    }
    const e = this.elements.waveformCanvas, t = e.getContext("2d");
    if (!t) {
      console.error("Failed to get canvas context.");
      return;
    }
    e.width = this.waveformConfig.width || 300, e.height = this.waveformConfig.height || 150;
    const i = this.analyser.frequencyBinCount, s = new Uint8Array(i), n = () => {
      if (!(!this.analyser || !t))
        try {
          this.animationFrameId = requestAnimationFrame(n), this.analyser.getByteTimeDomainData(s), t.fillStyle = this.waveformConfig.backgroundColor || "#000000", t.fillRect(0, 0, e.width, e.height), t.lineWidth = 2, t.strokeStyle = this.waveformConfig.waveformColor || "#00ff00", t.beginPath();
          const h = e.width / i;
          let l = 0;
          for (let o = 0; o < i; o++) {
            const C = s[o] / 128 * e.height / 2;
            o === 0 ? t.moveTo(l, C) : t.lineTo(l, C), l += h;
          }
          t.lineTo(e.width, e.height / 2), t.stroke();
        } catch (h) {
          console.error("Error in draw loop:", h), this.animationFrameId && (cancelAnimationFrame(this.animationFrameId), this.animationFrameId = null);
        }
    };
    if (this.waveformConfig.refreshRate && this.waveformConfig.refreshRate < 60) {
      const h = 1e3 / this.waveformConfig.refreshRate;
      let l = 0;
      const o = (a) => {
        (!l || a - l >= h) && (n(), l = a), this.animationFrameId = requestAnimationFrame(o);
      };
      this.animationFrameId = requestAnimationFrame(o);
    } else
      n();
    console.log("Waveform drawing started");
  }
  stopWaveform() {
    var e, t;
    if (this.animationFrameId !== null && (cancelAnimationFrame(this.animationFrameId), this.animationFrameId = null), this.analyser && (this.analyser.disconnect(), this.analyser = null), this.audioContext && (this.audioContext.close(), this.audioContext = null), (e = this.elements) != null && e.waveformCanvas) {
      const i = this.elements.waveformCanvas.getContext("2d");
      i && i.clearRect(
        0,
        0,
        this.elements.waveformCanvas.width,
        this.elements.waveformCanvas.height
      );
    }
    (t = this.elements) != null && t.waveformContainer && this.elements.waveformContainer.classList.add("hidden");
  }
  dispose() {
    var e;
    this.stopRecording(), (e = this.elements) != null && e.waveformContainer && window.removeEventListener("resize", this.updateWaveformPosition), this.elements && (Object.values(this.elements).forEach((t) => {
      var i;
      t instanceof HTMLElement && (this.removeEventListeners(t), t === ((i = this.elements) == null ? void 0 : i.waveformContainer) && t.remove());
    }), this.elements.micWidget.remove(), this.elements = null), this.micListCache = null, this.micListCacheTimestamp = 0, E._instanceCreated = !1;
  }
};
r(E, "_instanceCreated", !1);
let W = E;
console.log("JS Audio Tools	Version: 2025.4.18	Author: Julian Frank");
export {
  W as MicManager
};
