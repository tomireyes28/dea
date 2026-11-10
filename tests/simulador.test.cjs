const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function crearSimulador({ audioFalla = false } = {}) {
  let tiempo = 0;
  let siguienteId = 1;
  const timers = new Map();
  const audios = [];
  const avisos = [];
  const elementos = {};
  for (const tag of html.matchAll(/<\w+\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const clases = new Set((tag[0].match(/class="([^"]*)"/)?.[1] || '').split(/\s+/));
    elementos[tag[1]] = {
      disabled: /\sdisabled(?:\s|>)/.test(tag[0]),
      innerText: '', style: {},
      classList: {
        add: c => clases.add(c), remove: c => clases.delete(c),
        contains: c => clases.has(c),
      },
    };
  }
  class Audio {
    constructor(src) {
      this.src = src;
      this.paused = true;
      this.currentTime = 0;
      audios.push(this);
    }
    play() {
      this.paused = audioFalla;
      return audioFalla ? Promise.reject(new Error('Audio no disponible')) : Promise.resolve();
    }
    pause() { this.paused = true; }
  }
  function programar(fn, delay, intervalo = false) {
    const id = siguienteId++;
    timers.set(id, { fn, at: tiempo + delay, delay, intervalo });
    return id;
  }
  const ctx = vm.createContext({
    document: {
      getElementById: id => elementos[id],
      querySelectorAll: () => [1, 2, 3, 4, 5].map(i => elementos[`led${i}`]),
    },
    Audio, console: { warn: (...args) => avisos.push(args) },
    setTimeout: (fn, delay) => programar(fn, delay),
    setInterval: (fn, delay) => programar(fn, delay, true),
    clearTimeout: id => timers.delete(id), clearInterval: id => timers.delete(id),
  });
  vm.runInContext(source, ctx);
  function avanzar(ms) {
    const fin = tiempo + ms;
    for (;;) {
      const siguiente = [...timers.entries()].filter(([, t]) => t.at <= fin)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!siguiente) break;
      const [id, t] = siguiente;
      tiempo = t.at;
      if (t.intervalo) t.at += t.delay;
      else timers.delete(id);
      t.fn();
    }
    tiempo = fin;
  }
  return {
    ctx, elementos, timers, audios, avisos, avanzar,
    luces: () => [1, 2, 3, 4, 5].filter(i => elementos[`led${i}`].classList.contains('on')),
  };
}

test('SHOCK no funciona apagado ni antes de que termine la carga', () => {
  const s = crearSimulador();
  assert.equal(s.elementos.botonShock.disabled, true);
  s.ctx.shock();
  assert.equal(s.audios.length, 0);
  assert.equal(s.timers.size, 0);
  // La función también protege contra una habilitación accidental del botón.
  s.elementos.botonShock.disabled = false;
  s.ctx.shock();
  assert.equal(s.timers.size, 0);
  s.ctx.iniciarSimulacion();
  s.avanzar(24000);
  s.ctx.shock();
  assert.match(s.elementos.output.innerText, /Cargando/);
  s.avanzar(6000);
  assert.equal(s.elementos.botonShock.disabled, false);
});

test('conserva los ciclos de dos minutos y alterna los escenarios', () => {
  const s = crearSimulador();
  s.ctx.iniciarSimulacion();
  s.ctx.iniciarSimulacion();
  assert.equal(s.timers.size, 1);
  s.avanzar(30000);
  s.ctx.shock();
  s.ctx.shock();
  assert.deepEqual(s.luces(), [1, 2]);
  s.avanzar(4000);
  assert.equal(s.elementos.contador.innerText, 'RCP: 2:00');
  assert.deepEqual(s.luces(), [1, 2]);
  s.avanzar(120000);
  assert.equal(s.elementos.output.innerText, 'Analizando ritmo cardíaco.');
  s.avanzar(10000);
  assert.match(s.elementos.output.innerText, /No se recomienda descarga/);
  assert.equal(s.elementos.botonShock.disabled, true);
  assert.equal(s.elementos.contador.innerText, 'RCP: 2:00');
  assert.deepEqual(s.luces(), [1, 2]);
  s.avanzar(136000);
  assert.equal(s.elementos.botonShock.disabled, false);
});

test('una nueva locución detiene la anterior sin alterar los tiempos', () => {
  const s = crearSimulador();
  s.ctx.iniciarSimulacion();
  s.avanzar(30000);
  const indicacion = s.audios.at(-1);
  assert.equal(indicacion.src, 'shock.mp3');
  s.ctx.shock();
  assert.equal(indicacion.paused, true);
  assert.equal(s.audios.at(-1).src, 'rcp.mp3');
  assert.equal(s.audios.filter(a => !a.paused).length, 1);
});

test('OFF detiene todos los audios y temporizadores en cada etapa', () => {
  for (const t of [0, 1000, 7000, 14000, 17000, 24000, 30000, 32000, 34000, 60000, 154000, 164000]) {
    const s = crearSimulador();
    s.ctx.iniciarSimulacion();
    if (t >= 30000) {
      s.avanzar(30000);
      s.ctx.shock();
      s.avanzar(t - 30000);
    } else s.avanzar(t);
    s.ctx.apagarSimulador();
    assert.ok(s.audios.every(a => a.paused && a.currentTime === 0), `OFF a ${t} ms`);
    assert.equal(s.timers.size, 0);
    s.avanzar(400000);
    assert.deepEqual(s.luces(), []);
    assert.equal(s.elementos.botonEncendido.disabled, false);
    assert.equal(s.elementos.botonApagado.disabled, true);
    assert.equal(s.elementos.botonShock.disabled, true);
    assert.equal(s.elementos.contador.innerText, '');
  }
});

test('reiniciar no conserva sonidos ni callbacks de la sesión anterior', () => {
  const s = crearSimulador();
  s.ctx.iniciarSimulacion();
  const anterior = s.audios[0];
  s.avanzar(1000);
  s.ctx.apagarSimulador();
  s.ctx.iniciarSimulacion();
  assert.equal(anterior.paused, true);
  assert.equal(s.audios.filter(a => !a.paused).length, 1);
  s.avanzar(30000);
  assert.equal(s.elementos.botonShock.disabled, false);
  s.ctx.shock();
  s.avanzar(124000 + 10000);
  s.ctx.apagarSimulador();
  s.ctx.iniciarSimulacion();
  s.avanzar(30000);
  assert.equal(s.elementos.botonShock.disabled, false);
});

test('los rechazos de reproducción se gestionan sin romper el ciclo', async () => {
  const s = crearSimulador({ audioFalla: true });
  s.ctx.iniciarSimulacion();
  s.avanzar(30000);
  s.ctx.shock();
  s.avanzar(4000);
  await Promise.resolve();
  assert.equal(s.avisos.length, s.audios.length);
  assert.equal(s.elementos.contador.innerText, 'RCP: 2:00');
  s.ctx.apagarSimulador();
});
