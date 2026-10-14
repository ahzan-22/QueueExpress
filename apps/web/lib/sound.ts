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
    utterance.pitch = 1.05;
    // Pilih suara Indonesia bila ada. Kalau tidak ada (umum di Chrome Windows
    // yang cuma punya suara Inggris — inilah yang bikin pengumuman terdengar
    // "bule"), fallback ke Melayu (serumpun) lalu default.
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang.toLowerCase().startsWith('id')) ??
      voices.find((v) => v.lang.toLowerCase().startsWith('ms')) ??
      voices.find((v) => v.lang.toLowerCase().startsWith('jv')) ??
      null;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    synth.speak(utterance);
  } catch {
    // abaikan — suara bersifat enhancement
  }
}

const DIGIT_ID = [
  'kosong',
  'satu',
  'dua',
  'tiga',
  'empat',
  'lima',
  'enam',
  'tujuh',
  'delapan',
  'sembilan',
] as const;

/**
 * Eja nomor tiket menjadi kata Bahasa Indonesia, mis. "A-001" -> "A, kosong kosong satu".
 * Angka dieja kata-per-kata supaya tetap jelas walau browser cuma punya suara Inggris
 * (yang akan membaca "0" sebagai "zero" kalau dikirim mentah).
 */
export function spellTicketId(ticketNum: string): string {
  const parts = ticketNum.split('-');
  const spoken: string[] = [];

  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      spoken.push(
        part
          .split('')
          .map((d) => DIGIT_ID[Number(d)] ?? d)
          .join(' '),
      );
    } else if (/^[a-zA-Z]+$/.test(part)) {
      // Huruf dieja satu-satu ("CK" -> "C K") supaya tidak dibaca sebagai kata Inggris.
      spoken.push(part.toUpperCase().split('').join(' '));
    } else if (part) {
      spoken.push(part);
    }
  }

  return spoken.join(', ');
}

/** Varian sapaan santai, dipilih acak tiap panggilan biar nggak monoton. */
const ANNOUNCEMENT_TEMPLATES: ReadonlyArray<(spelled: string) => string> = [
  (s) => `Nomor antrean ${s}, yuk merapat ke lokasi layanan ya!`,
  (s) => `Halo! Nomor antrean ${s}, giliran kamu nih, langsung merapat ya!`,
  (s) => `Panggilan untuk nomor antrean ${s}, ditunggu di lokasi layanan!`,
  (s) => `Nomor antrean ${s}, gaskeun merapat, giliranmu sudah tiba!`,
];

/** Kombinasi standar panggilan antrean: chime lalu suara. */
export function announceQueue(ticketNum: string): void {
  playChime();
  // Beri jeda agar chime terdengar dulu sebelum suara bicara.
  window.setTimeout(() => {
    const spelled = spellTicketId(ticketNum);
    const template =
      ANNOUNCEMENT_TEMPLATES[Math.floor(Math.random() * ANNOUNCEMENT_TEMPLATES.length)] ??
      ((s: string) => `Nomor antrean ${s}, yuk merapat ke lokasi layanan ya!`);
    speakAnnouncement(template(spelled));
  }, 650);
}

/** Dipanggil dari gesture user (tombol "Aktifkan suara") agar AudioContext unlock. */
export function unlockAudio(): void {
  playChime();
  cancelSpeech();
  // Panaskan daftar voices di Chrome (async). Chrome sering mengembalikan
  // daftar kosong di awal, lalu mengisi lewat event voiceschanged — tanpa ini
  // suara Indonesia tidak pernah ketemu dan fallback ke Inggris.
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      synth.getVoices();
      if (typeof synth.onvoiceschanged !== 'undefined') {
        synth.onvoiceschanged = () => {
          try {
            synth.getVoices();
          } catch {
            // abaikan
          }
        };
      }
    }
  } catch {
    // abaikan
  }
  // Bunyi tes langsung dibatalkan supaya tidak mengganggu — unlock saja.
  cancelSpeech();
}
