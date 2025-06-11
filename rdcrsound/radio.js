// Datos iniciales: radios, eventos, noticias

const radios = [
  {
    id: 1,
    name: "Radio 1",
    logo: "https://via.placeholder.com/60x60.png?text=R1",
    stream: "https://stream-url-radio1.mp3",
  },
  {
    id: 2,
    name: "Radio 2",
    logo: "https://via.placeholder.com/60x60.png?text=R2",
    stream: "https://stream-url-radio2.mp3",
  },
];

const eventos = [
  "Concierto en Plaza Central - 12 Junio 2025",
  "Festival de Música Electrónica - 25 Julio 2025",
  "Noche de Jazz - 5 Agosto 2025",
];

const noticias = [
  "Lanzamos nueva app para iOS y Android.",
  "Radio 1 estrena programación especial.",
  "Productora ganadora de premio local.",
];

// Función para cargar radios en DOM

function loadRadios() {
  const container = document.getElementById("radio-list");
  container.innerHTML = "";

  radios.forEach((radio) => {
    const radioEl = document.createElement("div");
    radioEl.className = "radio-item";

    radioEl.innerHTML = `
      <h3>${radio.name}</h3>
      <div class="player">
        <img class="player-logo" src="${radio.logo}" alt="${radio.name} logo" />
        <button class="play-btn" data-stream="${radio.stream}" aria-label="Play ${radio.name}">▶️</button>
      </div>
    `;

    container.appendChild(radioEl);
  });
}

// Variables para controlar la reproducción

let currentAudio = null;
let currentBtn = null;

// Función para manejar play/pause y que solo una radio suene

function setupPlayer() {
  const buttons = document.querySelectorAll(".play-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const streamUrl = btn.dataset.stream;

      // Si ya está sonando esta radio, pausa
      if (currentBtn === btn && !currentAudio.paused) {
        currentAudio.pause();
        btn.textContent = "▶️";
        btn.classList.remove("playing");
        return;
      }

      // Si otra radio está sonando, pausa esa
      if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        if (currentBtn) {
          currentBtn.textContent = "▶️";
          currentBtn.classList.remove("playing");
        }
      }

      // Reproduce nuevo stream
      if (!currentAudio || currentBtn !== btn) {
        currentAudio = new Audio(streamUrl);
        currentAudio.play();
        btn.textContent = "⏸️";
        btn.classList.add("playing");
        currentBtn = btn;

        currentAudio.addEventListener("ended", () => {
          btn.textContent = "▶️";
          btn.classList.remove("playing");
        });
        currentAudio.addEventListener("pause", () => {
          btn.textContent = "▶️";
          btn.classList.remove("playing");
        });
      }
    });
  });
}

// Cargar eventos en lista

function loadEventos() {
  const el = document.getElementById("eventos-list");
  el.innerHTML = "";
  eventos.forEach((e) => {
    const li = document.createElement("li");
    li.textContent = e;
    el.appendChild(li);
  });
}

// Cargar noticias en lista

function loadNoticias() {
  const el = document.getElementById("noticias-list");
  el.innerHTML = "";
  noticias.forEach((n) => {
    const li = document.createElement("li");
    li.textContent = n;
    el.appendChild(li);
  });
}

// Inicialización

function init() {
  loadRadios();
  setupPlayer();
  loadEventos();
  loadNoticias();
}

window.addEventListener("DOMContentLoaded", init);
