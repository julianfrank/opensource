var a = Object.defineProperty;
var s = (r, t, o) => t in r ? a(r, t, { enumerable: !0, configurable: !0, writable: !0, value: o }) : r[t] = o;
var e = (r, t, o) => s(r, typeof t != "symbol" ? t + "" : t, o);
const S = "2025.4.28";
class m {
  constructor() {
    e(this, "version");
    e(this, "gumStream", null);
    this.version = S, console.log(
      `Gum2NovaSonic	|	version : ${this.version}	|	Author : Julian Frank`
    );
  }
  setStreamTarget() {
    return {
      setStream: this.setStream,
      start: this.start,
      stop: this.stop,
      onStreamStart: this.onStreamStart,
      onStreamStop: this.onStreamStop,
      onStreamError: this.onStreamError
    };
  }
  setStream(t) {
    if (t === void 0) throw new Error("Stream from GUM cannot be undefined");
    this.gumStream && this.gumStream.getTracks().forEach((o) => {
      o.stop();
    }), this.gumStream = t;
  }
  start() {
    console.log("GUM Stream Start Called");
  }
  stop() {
    console.log("GUM Stream Stop Called");
  }
  onStreamStart() {
    console.log("GUM Stream Started");
  }
  onStreamStop() {
    console.log("GUM Stream Stopped");
  }
  onStreamError(t) {
    console.error(`GUM Stream Error: ${t}`);
  }
}
export {
  m as Gum2NovaSonic,
  m as default
};
