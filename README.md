# Simulador DEA — LIFE-SAVE 3000

Aplicación web de entrenamiento utilizada en cursos de una clínica para acompañar prácticas sobre el uso de un desfibrilador externo automático (DEA). Presenta una secuencia guiada con instrucciones de voz, indicadores luminosos y ciclos de reanimación cardiopulmonar (RCP).

## Contexto y objetivo

El proyecto ofrece una interfaz que representa los controles de un DEA para que el instructor pueda acompañar la práctica con indicaciones visuales y sonoras. Su alcance es una simulación educativa: no analiza señales de un paciente ni se conecta a un equipo médico.

## Funcionamiento

1. **ON** inicia las indicaciones para colocar los parches y conectar los cables.
2. El simulador reproduce las etapas de análisis y preparación de la descarga.
3. **SHOCK** se habilita únicamente cuando se solicita la descarga simulada.
4. Comienza un ciclo de RCP de dos minutos con contador y metrónomo.
5. La secuencia alterna de forma programada entre escenarios con descarga y sin descarga, hasta apagar el simulador.

**OFF** cancela los temporizadores, detiene las locuciones y el metrónomo y restablece los controles. Al reiniciar, la secuencia vuelve al primer escenario con descarga.

## Ejecutar el proyecto

Descargá el repositorio completo y abrí `index.html` en un navegador con soporte para audio MP3. Conservá los archivos de audio y el logo junto al HTML. Activá el sonido del dispositivo y pulsá **ON** para comenzar.

No requiere instalación, compilación, servidor ni conexión a Internet una vez descargados todos los archivos. También puede alojarse en un servicio de sitios estáticos conservando la misma estructura.

## Tecnologías y decisiones

- **HTML, CSS y JavaScript nativos**, sin dependencias externas.
- **Audio del navegador** para las instrucciones y el metrónomo.
- **Temporizadores** para coordinar las etapas y el contador de RCP.
- **Un único HTML** para facilitar su distribución y uso en los cursos.

El diseño representa un equipo con pantalla, botones e indicadores. Las correcciones de mantenimiento preservan los textos y los tiempos de la secuencia original: bloqueo inicial de SHOCK, control de las locuciones y apagado de las luces de análisis y carga durante RCP. Se reproduce una sola locución a la vez; el metrónomo puede acompañar las instrucciones de RCP.

## Archivos

- `index.html`: interfaz, estilos y lógica de simulación.
- `*.mp3`: instrucciones de voz y metrónomo.
- `logo_adventista.png`: recurso gráfico mostrado en la interfaz.
- `tests/simulador.test.cjs`: pruebas de regresión de la lógica, con DOM, audio y tiempo simulados.

## Verificación

Con Node.js instalado, ejecutá:

```sh
node --test tests/simulador.test.cjs
```

Las pruebas cubren el bloqueo de SHOCK, la secuencia con y sin descarga, las luces durante RCP, el apagado y el reinicio. No requieren paquetes adicionales; Node.js solo se utiliza para estas pruebas.

Antes de usarlo en un curso, comprobá en el dispositivo de destino la reproducción de las instrucciones, el volumen y la visualización de los controles. Las pruebas simuladas no verifican la salida de sonido ni la apariencia en navegadores reales. El contador depende de los temporizadores del navegador y puede demorarse si se suspende la pestaña o el dispositivo.
