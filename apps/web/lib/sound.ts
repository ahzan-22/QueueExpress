'use client';

/**
 * Audio announcement engine (PRD section C.2).
 *
 * - `playChime()` memakai WebAudio oscillator (tanpa file eksternal, jadi
 *   tidak bisa 404) dan aman dipanggil berulang.
 * - `speakAnnouncement()` memakai SpeechSynthesis dengan guard lengkap agar
 *   tidak throw di browser tanpa dukungan / SSR.
 * - Semua fungsi no-op di server dan tidak pernah throw ke caller.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) {
    return null;
  }
  try {
    if (!audioCtx) {
      audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume().catch(() => undefined);
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/** Bel dua-nada (E5 -> C5) yang halus untuk panggilan antrean. */
export function playChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }
    const now = ctx.currentTime;
    const notes: Array<{ freq: number; at: number }> = [
      { freq: 659.25, at: 0 },
      { freq: 523.25, at: 0.22 },
    ];
    for (const { freq, at } of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + at);
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.25, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.55);
    }
  } catch {
    // Audio tidak boleh memecahkan UI.
  }
}

export function cancelSpeech(): void {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // abaikan
  }
}

/** Ucapkan teks Bahasa Indonesia. Selalu cancel antrean lama dulu. */
export function speakAnnouncement(text: string): void {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    // Pilih suara id-ID bila tersedia, fallback ke default.
    const voices = synth.getVoices();
    const idVoice = voices.find((v) => v.lang.toLowerCase().startsWith('id'));
    if (idVoice) {
      utterance.voice = idVoice;
    }
    synth.speak(utterance);
  } catch {
    // abaikan — suara bersifat enhancement
  }
}

/** Kombinasi standar panggilan antrean: chime lalu suara. */
export function announceQueue(ticketNum: string): void {
  playChime();
  // Beri jeda agar chime terdengar dulu sebelum suara bicara.
  window.setTimeout(() => {
    speakAnnouncement(`Nomor ${ticketNum}, silakan menuju lokasi layanan`);
  }, 650);
}

/** Dipanggil dari gesture user (tombol "Aktifkan suara") agar AudioContext unlock. */
export function unlockAudio(): void {
  playChime();
  cancelSpeech();
  // Panaskan daftar voices di Chrome (async).
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  } catch {
    // abaikan
  }
  // Bunyi tes langsung dibatalkan supaya tidak mengganggu — unlock saja.
  cancelSpeech();
}
