(function(){"use strict";try{if(typeof document<"u"){var e=document.createElement("style");e.appendChild(document.createTextNode(".mic-widget{position:relative;height:fit-content;width:fit-content;min-width:4rem;min-height:2rem;margin:0%;padding:0%;display:flex;flex-direction:row;align-items:center;justify-content:flex-start}.mic-controls{display:flex;align-items:center;width:100%}.waveform-container{position:absolute;top:100%;left:0;width:100%;margin-top:.5rem;padding:.5rem;background-color:#0000001a;border-radius:.25rem;box-shadow:inset 0 0 .5rem #0003;transition:opacity 1s ease-in-out;opacity:1;z-index:1000;pointer-events:auto;visibility:visible;display:block}.waveform-container.hidden{opacity:0;pointer-events:none;visibility:hidden;display:none}.waveform-canvas{display:block;background-color:#000;border-radius:.25rem;width:100%;height:auto;image-rendering:pixelated}.mic-settings-container{position:relative;display:flex;align-items:center}.settings-button{margin:.2rem;padding:0;height:1.5rem;width:1.5rem;line-height:1.5rem;text-align:center;display:inline-block;box-shadow:0 0 .5rem #00000080;transition:box-shadow .3s ease;background-color:transparent;border-radius:.25rem;cursor:pointer;-webkit-user-select:none;user-select:none}.settings-button:hover{box-shadow:inset 0 0 .5rem #00000080}.mic-list{position:absolute;top:100%;left:0;z-index:1000;background-color:#fff;border:1px solid #ccc;border-radius:.25rem;box-shadow:0 2px 4px #0003;margin-top:.2rem}.mic-list-hidden{display:none}.start-button,.stop-button{margin:.2rem;padding:0;height:1.5rem;min-width:1.5rem;line-height:1.5rem;text-align:center;display:inline-block;box-shadow:0 0 .5rem #00000080;transition:box-shadow .3s ease;background-color:transparent;border-radius:.25rem;cursor:pointer;-webkit-user-select:none;user-select:none}.stop-button{display:none}.start-button:hover,.stop-button:hover{box-shadow:inset 0 0 .5rem #00000080}")),document.head.appendChild(e)}}catch(t){console.error("vite-plugin-css-injected-by-js",t)}})();
var A = Object.defineProperty;
var F = (g, e, t) => e in g ? A(g, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : g[e] = t;
var n = (g, e, t) => F(g, typeof e != "symbol" ? e + "" : e, t);
const W = "2025.4.20";
class k extends Error {
  constructor(e) {
    super(e), this.name = "MicManagerError";
  }
}
class x extends k {
  constructor(e) {
    super(e), this.name = "StreamError";
  }
}
class L extends k {
  constructor(e) {
    super(e), this.name = "DeviceError";
  }
}
const b = class b {
  constructor(e) {
    n(this, "stream", null);
    n(this, "rootElement");
    n(this, "elements", null);
    n(this, "startButton", null);
    n(this, "stopButton", null);
    n(this, "streamTarget", null);
    n(this, "useDefaultAudioElement", !0);
    n(this, "eventListeners", /* @__PURE__ */ new Map());
    n(this, "micListCache", null);
    n(this, "micListCacheTimestamp", 0);
    n(this, "MIC_LIST_CACHE_DURATION", 5e3);
    // Cache duration in milliseconds
    // Waveform visualization properties
    n(this, "audioContext", null);
    n(this, "analyser", null);
    n(this, "waveformConfig", {
      enabled: !0,
      width: 64,
      height: 32,
      resolution: 32,
      refreshRate: 1,
      backgroundColor: "#000000",
      waveformColor: "#00ff00"
    });
    n(this, "animationFrameId", null);
    n(this, "updateWaveformPosition", () => {
      var e, t;
      if ((e = this.elements) != null && e.waveformContainer && ((t = this.elements) != null && t.micWidget)) {
        const i = this.elements.micWidget.getBoundingClientRect();
        this.elements.waveformContainer.style.left = `${i.left}px`, this.elements.waveformContainer.style.top = `${i.bottom + 8}px`;
      }
    });
    if (b._instanceCreated)
      throw new k("MicManager instance already created");
    b._instanceCreated = !0, this.rootElement = (e == null ? void 0 : e.rootElement) || document.body, e.streamTarget && this.setStreamTarget(e.streamTarget), console.log(`Mic Manager	Version: ${W}	Author: Julian Frank`);
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
      throw new L("MediaDevices API not supported");
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
      throw console.error("Error getting microphone list:", t), t instanceof Error ? new L(t.message) : new L("Failed to get microphone list");
    }
  }
  updateMicList(e, t) {
    for (; e.firstChild; )
      e.removeChild(e.firstChild);
    const i = document.createDocumentFragment();
    t.forEach((s) => {
      const o = document.createElement("option");
      o.value = s.deviceId, o.text = s.label, i.appendChild(o);
    }), e.appendChild(i);
  }
  createMicUI(e) {
    const {
      rootElement: t = this.rootElement,
      startButtonText: i = "🎙️",
      stopButtonText: s = "🛑",
      onStartRecording: o,
      onStopRecording: c,
      onAudioElementError: l,
      streamTarget: a,
      waveform: r,
      showMicSettings: v = !1
    } = e;
    a && this.setStreamTarget(a), r && (this.waveformConfig = {
      ...this.waveformConfig,
      ...r
    });
    const h = document.createElement("div");
    h.classList.add("mic-widget"), t.appendChild(h);
    const E = document.createElement("div");
    E.classList.add("mic-settings-container"), v || (E.style.display = "none"), h.appendChild(E);
    const w = document.createElement("div");
    w.classList.add("settings-button"), w.textContent = "⚙️", w.setAttribute("role", "button"), w.setAttribute("tabindex", "0"), E.appendChild(w);
    const C = document.createElement("select");
    C.classList.add("mic-list"), C.classList.add("mic-list-hidden"), E.appendChild(C), this.addEventListenerWithCleanup(w, "click", () => {
      C.classList.toggle("mic-list-hidden");
    });
    const m = document.createElement("div");
    m.classList.add("start-button"), m.textContent = i, m.setAttribute("role", "button"), m.setAttribute("tabindex", "0"), h.appendChild(m), this.startButton = m;
    const d = document.createElement("div");
    d.classList.add("stop-button"), d.textContent = s, d.setAttribute("role", "button"), d.setAttribute("tabindex", "0"), h.appendChild(d), this.stopButton = d;
    const T = document.createElement("audio");
    T.classList.add("audio-element"), this.useDefaultAudioElement || (T.style.display = "none"), h.appendChild(T);
    let p, f;
    return this.waveformConfig.enabled && (f = document.createElement("div"), f.classList.add("waveform-container", "hidden"), t.appendChild(f), f.style.position = "absolute", f.style.width = `${this.waveformConfig.width || 300}px`, f.style.display = "block", f.style.visibility = "visible", p = document.createElement("canvas"), p.classList.add("waveform-canvas"), p.width = this.waveformConfig.width || 300, p.height = this.waveformConfig.height || 150, p.style.display = "block", f.appendChild(p), f.offsetHeight, this.updateWaveformPosition(), window.addEventListener("resize", this.updateWaveformPosition)), this.addEventListenerWithCleanup(
      C,
      "change",
      this.handleMicChange.bind(this)
    ), this.addEventListenerWithCleanup(m, "click", async () => {
      try {
        await this.startRecording(C.value), o == null || o(this.stream), this.waveformConfig.enabled && this.stream && this.setupWaveform(this.stream), m.style.display = "none", d.style.display = "block";
      } catch (u) {
        console.error("Error starting recording:", u);
        const y = u instanceof Error ? new x(u.message) : new x("Failed to start recording");
        l == null || l(y);
      }
    }), this.addEventListenerWithCleanup(d, "click", () => {
      this.stopRecording(), c == null || c(), m.style.display = "block", d.style.display = "none";
    }), this.getMicrophoneList().then((u) => {
      var y;
      this.updateMicList(C, u), (y = e.onMicListChange) == null || y.call(e, u);
    }).catch((u) => {
      var S;
      const y = u instanceof Error ? new L(u.message) : new L("Failed to initialize microphone list");
      (S = e.onAudioElementError) == null || S.call(e, y);
    }), this.elements = {
      micWidget: h,
      micSettingsContainer: E,
      settingsButton: w,
      micList: C,
      startButton: m,
      stopButton: d,
      audioElement: T,
      waveformCanvas: p,
      waveformContainer: f
    }, this.elements;
  }
  async handleMicChange() {
    this.stream && (this.stopRecording(), this.startButton && this.stopButton && (this.startButton.style.display = "block", this.stopButton.style.display = "none"));
  }
  async startRecording(e) {
    var i, s, o, c, l, a;
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
      ), this.stream && (this.streamTarget ? (this.streamTarget.setStream(this.stream), (s = (i = this.streamTarget).start) == null || s.call(i), (c = (o = this.streamTarget).onStreamStart) == null || c.call(o)) : this.useDefaultAudioElement && this.elements && (this.elements.audioElement.srcObject = this.stream, await this.elements.audioElement.play()));
    } catch (r) {
      console.error("Error starting recording:", r);
      const v = r instanceof Error ? new x(r.message) : new x("Failed to start recording");
      throw this.streamTarget && ((a = (l = this.streamTarget).onStreamError) == null || a.call(l, v)), v;
    }
  }
  stopRecording() {
    var e, t, i, s;
    if (this.stream)
      try {
        this.stopWaveform(), this.stream.getTracks().forEach((o) => {
          try {
            o.stop();
          } catch (c) {
            console.warn("Error stopping track:", c);
          }
        }), this.streamTarget ? (this.streamTarget.setStream(null), (t = (e = this.streamTarget).stop) == null || t.call(e), (s = (i = this.streamTarget).onStreamStop) == null || s.call(i)) : this.elements && (this.elements.audioElement.srcObject = null);
      } catch (o) {
        console.error("Error in stopRecording:", o);
      } finally {
        this.stream = null;
      }
  }
  setupWaveform(e) {
    var t, i;
    if (this.waveformConfig.enabled) {
      if (!((t = this.elements) != null && t.waveformCanvas) || !((i = this.elements) != null && i.waveformContainer)) {
        console.error("Waveform elements not found");
        return;
      }
      try {
        this.elements.waveformContainer.classList.remove("hidden"), this.elements.waveformContainer.style.display = "block", this.elements.waveformContainer.style.visibility = "visible", this.elements.waveformContainer.offsetHeight, this.audioContext || (this.audioContext = new AudioContext());
        try {
          this.analyser = this.audioContext.createAnalyser(), this.analyser.fftSize = this.waveformConfig.resolution * 2;
        } catch (s) {
          console.error("Failed to create analyzer:", s);
          return;
        }
        try {
          this.audioContext.createMediaStreamSource(
            e
          ).connect(this.analyser);
        } catch (s) {
          console.error("Failed to connect stream to analyzer:", s);
          return;
        }
        this.updateWaveformPosition(), this.drawWaveform();
      } catch (s) {
        console.error("Error in setupWaveform:", s);
      }
    }
  }
  drawWaveform() {
    var c;
    if (!this.waveformConfig.enabled)
      return;
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
    const i = this.analyser.frequencyBinCount, s = new Uint8Array(i), o = () => {
      if (!(!this.analyser || !t))
        try {
          this.animationFrameId = requestAnimationFrame(o), this.analyser.getByteTimeDomainData(s), t.fillStyle = this.waveformConfig.backgroundColor || "#000000", t.fillRect(0, 0, e.width, e.height), t.lineWidth = 2, t.strokeStyle = this.waveformConfig.waveformColor || "#00ff00", t.beginPath();
          const l = e.width / i;
          let a = 0;
          for (let r = 0; r < i; r++) {
            const h = s[r] / 128 * e.height / 2;
            r === 0 ? t.moveTo(a, h) : t.lineTo(a, h), a += l;
          }
          t.lineTo(e.width, e.height / 2), t.stroke();
        } catch (l) {
          console.error("Error in draw loop:", l), this.animationFrameId && (cancelAnimationFrame(this.animationFrameId), this.animationFrameId = null);
        }
    };
    if (this.waveformConfig.refreshRate && this.waveformConfig.refreshRate < 60) {
      const l = 1e3 / this.waveformConfig.refreshRate;
      let a = 0;
      const r = (v) => {
        (!a || v - a >= l) && (o(), a = v), this.animationFrameId = requestAnimationFrame(r);
      };
      this.animationFrameId = requestAnimationFrame(r);
    } else
      o();
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
  /**
   * Enables or disables the mic settings interface
   * @param enabled Whether the mic settings should be shown
   */
  toggleMicSettings(e) {
    var t;
    if (!((t = this.elements) != null && t.micSettingsContainer)) {
      console.warn("Mic settings container not initialized");
      return;
    }
    this.elements.micSettingsContainer.style.display = e ? "flex" : "none";
  }
  /**
   * Enables or disables the waveform visualization
   * @param enabled Whether the waveform should be shown
   */
  toggleWaveform(e) {
    this.waveformConfig.enabled = e, e ? this.stream && this.setupWaveform(this.stream) : this.stopWaveform();
  }
  /**
   * Sets custom styles for various UI components
   * @param styles Object containing style configurations
   */
  setStyle(e) {
    if (e.waveformColor && (this.waveformConfig.waveformColor = e.waveformColor), e.waveformBackgroundColor && (this.waveformConfig.backgroundColor = e.waveformBackgroundColor), !this.elements) {
      console.warn("UI elements not initialized");
      return;
    }
    e.backgroundColor && (this.elements.micWidget.style.backgroundColor = e.backgroundColor), (e.buttonBackgroundColor || e.buttonShadowColor) && [
      this.elements.startButton,
      this.elements.stopButton,
      this.elements.settingsButton
    ].forEach((i) => {
      e.buttonBackgroundColor && (i.style.backgroundColor = e.buttonBackgroundColor), e.buttonShadowColor && (i.style.boxShadow = `0rem 0rem 0.5rem ${e.buttonShadowColor}`);
    }), (e.micListBackgroundColor || e.micListBorderColor) && (e.micListBackgroundColor && (this.elements.micList.style.backgroundColor = e.micListBackgroundColor), e.micListBorderColor && (this.elements.micList.style.borderColor = e.micListBorderColor));
  }
  dispose() {
    var e;
    this.stopRecording(), (e = this.elements) != null && e.waveformContainer && window.removeEventListener("resize", this.updateWaveformPosition), this.elements && (Object.values(this.elements).forEach((t) => {
      var i;
      t instanceof HTMLElement && (this.removeEventListeners(t), t === ((i = this.elements) == null ? void 0 : i.waveformContainer) && t.remove());
    }), this.elements.micWidget.remove(), this.elements = null), this.micListCache = null, this.micListCacheTimestamp = 0, b._instanceCreated = !1;
  }
};
n(b, "_instanceCreated", !1);
let B = b;
console.log(`JS Audio Tools	Version: ${W}	Author: Julian Frank`);
export {
  B as MicManager
};
