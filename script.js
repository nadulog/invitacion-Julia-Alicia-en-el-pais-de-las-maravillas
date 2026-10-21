const EVENT_START = new Date("2027-01-23T21:00:00-03:00");
const EVENT_END = new Date("2027-01-24T02:00:00-03:00");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Costuras: dibujan el hilo rojo que une una pieza con la siguiente. */
const SVG_NS = "http://www.w3.org/2000/svg";

function setupSeams() {
  const seams = [...document.querySelectorAll(".seam")];

  seams.forEach((seam, index) => {
    const height = Number(seam.dataset.height);
    const from = Number(seam.dataset.from);
    const to = Number(seam.dataset.to);
    const fromSlope = Number(seam.dataset.fromSlope);
    const toSlope = Number(seam.dataset.toSlope);
    const bend = height * 0.45;

    // Sale vertical siguiendo la dirección del hilo de arriba y entra siguiendo la del de abajo.
    const d = `M${from} 0 C${from + fromSlope * bend} ${bend} ${to - toSlope * bend} ${height - bend} ${to} ${height}`;
    seam.style.setProperty("--seam-height", height);

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "seam__thread");
    svg.setAttribute("viewBox", `0 0 100 ${height}`);
    svg.setAttribute("aria-hidden", "true");

    const maskId = `seamReveal${index}`;
    svg.innerHTML = `
      <defs>
        <mask id="${maskId}" maskUnits="userSpaceOnUse" x="-10" y="-1" width="120" height="${height + 2}">
          <path class="seam__reveal" d="${d}" pathLength="1" />
        </mask>
      </defs>
      <g mask="url(#${maskId})">
        <path class="seam__base" d="${d}" />
        <path class="seam__twist" d="${d}" />
        <path class="seam__shine" d="${d}" transform="translate(-0.12 0)" />
      </g>`;
    seam.append(svg);
  });

  return seams;
}

// El hilo se empieza a dibujar recién cuando se cierra la intro, para que no se
// pierda la animación de la primera costura detrás de las puertas.
function drawSeamsOnScroll(seams) {
  if (reducedMotion) return;

  let pending = [...seams];
  let frame = 0;

  // Cada costura se dibuja cuando entra en el 88% de arriba de la pantalla
  // (o si ya quedó arriba porque se scrolleó muy rápido).
  function check() {
    frame = 0;
    const limit = window.innerHeight * 0.88;
    pending = pending.filter((seam) => {
      if (seam.getBoundingClientRect().top < limit) {
        seam.classList.add("is-drawn");
        return false;
      }
      return true;
    });
    if (!pending.length) window.removeEventListener("scroll", onScroll);
  }

  function onScroll() {
    if (!frame) frame = window.requestAnimationFrame(check);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  check();
}

const seams = setupSeams();

/* Cuenta regresiva. */
const countdownFields = {
  days: document.querySelector("#days"),
  hours: document.querySelector("#hours"),
  minutes: document.querySelector("#minutes"),
  seconds: document.querySelector("#seconds"),
};

function updateCountdown() {
  const remaining = Math.max(0, EVENT_START.getTime() - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);

  countdownFields.days.textContent = String(Math.floor(totalSeconds / 86400)).padStart(2, "0");
  countdownFields.hours.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, "0");
  countdownFields.minutes.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  countdownFields.seconds.textContent = String(totalSeconds % 60).padStart(2, "0");
}

updateCountdown();
window.setInterval(updateCountdown, 1000);

/* Agregar al calendario. */
function toIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function downloadCalendarEvent() {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Julia//Invitacion XV//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:xv-julia-20270123@bloomdate",
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(EVENT_START)}`,
    `DTEND:${toIcsDate(EVENT_END)}`,
    "SUMMARY:XV de Julia",
    "LOCATION:Sunset Kids\\, José Roque Funes 1617\\, B° Cerro\\, Córdoba",
    "DESCRIPTION:¡No llegues tarde! Celebramos los XV de Julia.",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const file = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = "xv-julia.ics";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

document.querySelector("#calendarButton").addEventListener("click", downloadCalendarEvent);

/* Modal de regalos. */
const giftsModal = document.querySelector("#giftsModal");

function openModal(modal) {
  modal.showModal();
  document.body.classList.add("modal-open");
}

function syncModalState() {
  document.body.classList.toggle("modal-open", Boolean(document.querySelector("dialog[open]")));
}

function showCopyMessage(button, message) {
  const toast = button.closest(".modal-art").querySelector(".modal-toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toast.hideTimer);
  toast.hideTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

async function copyText(button) {
  const text = button.dataset.copy;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }

  showCopyMessage(button, button.dataset.copyMessage);
}

document.querySelector("#openGiftsModal").addEventListener("click", () => openModal(giftsModal));

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", () => copyText(button));
});

document.querySelectorAll("dialog").forEach((modal) => {
  modal.addEventListener("close", syncModalState);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });
});

/* Música: botón flotante para reproducir y pausar. */
const audioToggle = document.querySelector("#audioToggle");
const invitationAudio = document.querySelector("#invitationAudio");
let audioFadeFrame = 0;

function syncAudioControl(isPlaying) {
  audioToggle.classList.toggle("is-playing", isPlaying);
  audioToggle.setAttribute("aria-pressed", String(isPlaying));
  audioToggle.setAttribute("aria-label", isPlaying ? "Pausar música" : "Reproducir música");
}

function fadeAudioTo(targetVolume = 0.7, duration = 1600) {
  window.cancelAnimationFrame(audioFadeFrame);
  const startedAt = performance.now();
  const startingVolume = invitationAudio.volume;

  function step(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    invitationAudio.volume = startingVolume + (targetVolume - startingVolume) * eased;
    if (progress < 1) audioFadeFrame = window.requestAnimationFrame(step);
  }

  audioFadeFrame = window.requestAnimationFrame(step);
}

async function startInvitationAudio() {
  window.cancelAnimationFrame(audioFadeFrame);
  invitationAudio.volume = 0.05;

  try {
    await invitationAudio.play();
    fadeAudioTo();
  } catch {
    syncAudioControl(false);
  }
}

audioToggle.addEventListener("click", () => {
  if (invitationAudio.paused) {
    startInvitationAudio();
  } else {
    window.cancelAnimationFrame(audioFadeFrame);
    invitationAudio.pause();
  }
});

invitationAudio.addEventListener("play", () => syncAudioControl(true));
invitationAudio.addEventListener("pause", () => syncAudioControl(false));

/* Intro: entrar por la puerta con música o por la puerta sin música. */
function setupIntro() {
  const intro = document.querySelector(".intro");
  const main = document.querySelector("#invitationMain");
  let leaving = false;

  intro.querySelectorAll(".intro__door").forEach((door) => {
    door.addEventListener("click", () => {
      if (leaving) return;
      leaving = true;

      // Se llama dentro del toque para que los celulares permitan reproducir.
      if (door.dataset.music === "true") startInvitationAudio();

      // La cámara entra por el centro de la puerta elegida.
      const stage = intro.querySelector(".intro__stage");
      const center = ((door.offsetLeft + door.offsetWidth / 2) / stage.offsetWidth) * 100;
      stage.style.setProperty("--door-x", `${center}%`);
      intro.classList.add("is-leaving");

      window.setTimeout(() => {
        document.body.classList.remove("intro-is-open");
        intro.remove();
        audioToggle.hidden = false;
        window.scrollTo(0, 0);
        main.focus({ preventScroll: true });
        drawSeamsOnScroll(seams);
      }, reducedMotion ? 260 : 1700);
    });
  });
}

setupIntro();
