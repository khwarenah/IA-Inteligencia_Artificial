// main.js - Actualizado para una carga robusta
import { Mapa } from './mapa.js';
import { AgenteCC } from './agente.js';

// Usamos el evento 'load' para garantizar que todos los módulos y el DOM estén listos
window.addEventListener('load', () => {
    // 1. Obtener el canvas y el contexto una vez que el DOM está listo
    const canvas = document.getElementById('simulacion');
    if (!canvas) {
        console.error("No se pudo encontrar el canvas con id 'simulacion'.");
        return;
    }
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // Mantener los píxeles nítidos

    // 2. Instanciar el mapa y el agente
    const mapa = new Mapa(10, 10, 40);
    // C.C. inicia en el centro junto a la base
    const agente = new AgenteCC(mapa.baseX, mapa.baseY, 40);

    // 3. Definir el ciclo de simulación
    function cicloSimulacion() {
        // A. Percibir
        const percepcion = agente.percibir(mapa);

        // B. Decidir según regla de reflejo simple
        const accion = agente.reglaReflejo(percepcion);

        // C. Actuar
        agente.actuar(accion, mapa);

        // D. Redibujar todo
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        mapa.dibujar(ctx);
        agente.dibujar(ctx);
    }

    // 4. Iniciar la simulación con un pequeño retraso
    // Ejecutar un ciclo cada 500 milisegundos (medio segundo)
    console.log("Simulación de C.C. iniciada.");
    setInterval(cicloSimulacion, 500);
});