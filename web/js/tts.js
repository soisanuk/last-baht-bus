// Thai text-to-speech via the Web Speech API — adapted from the Soi Sanuk
// trainer. Silent no-op when no Thai voice exists (the game shows the
// romanisation anyway). Capacitor-ready: native plugin used when present.

const _tts = (() => {
  let _voice = null;

  const _capTTS = () =>
    (typeof window !== "undefined" && window.Capacitor?.Plugins?.TextToSpeech) || null;

  function _findVoice() {
    const voices = speechSynthesis.getVoices();
    _voice = voices.find(v => v.lang === "th-TH") ||
             voices.find(v => v.lang.startsWith("th")) || null;
  }

  if (typeof speechSynthesis !== "undefined") {
    _findVoice();
    speechSynthesis.addEventListener("voiceschanged", _findVoice);
  }

  // iOS refuses to speak until first used inside a user gesture.
  const _isIOS = typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
     (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  if (_isIOS && typeof speechSynthesis !== "undefined") {
    const unlock = () => {
      const utt = new SpeechSynthesisUtterance("");
      utt.volume = 0;
      speechSynthesis.speak(utt);
      document.removeEventListener("touchend", unlock);
      document.removeEventListener("click", unlock);
    };
    document.addEventListener("touchend", unlock);
    document.addEventListener("click", unlock);
  }

  return {
    available() { return !!_voice || !!_capTTS(); },
    speak(text) {
      if (!text) return;
      const cap = _capTTS();
      if (cap) {
        cap.stop().catch(() => {});
        cap.speak({ text, lang: "th-TH", rate: 0.85 }).catch(() => {});
        return;
      }
      if (!_voice) return;
      const voices = speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang === "th-TH") ||
                    voices.find(v => v.lang.startsWith("th")) || _voice;
      speechSynthesis.resume();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = "th-TH";
      u.rate = 0.85;
      if (_isIOS) speechSynthesis.speak(u);
      else setTimeout(() => speechSynthesis.speak(u), 50);
    },
  };
})();
