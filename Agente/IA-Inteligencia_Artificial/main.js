import { Mapa } from './mapa.js';
import { AgenteCC } from './agente.js';
import { Dragon } from './dragon.js';
import { Aliada } from './aliada.js';
import { Brujo } from './brujo.js';
import { Trampa } from './trampa.js';
import { Castillo } from './castillo.js';
import { Arbol } from './arbol.js';

window.addEventListener('load', () => {
    const canvas = document.getElementById('simulacion');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Referencias del panel
    const txtEstado = document.getElementById('txt-estado');
    const txtEnergia = document.getElementById('txt-energia');
    const progresoEnergia = document.getElementById('progreso-energia');
    const txtFragmentos = document.getElementById('txt-fragmentos');
    const txtCargando = document.getElementById('txt-cargando');

    const txtSalud = document.getElementById('txt-salud');
    const progresoSalud = document.getElementById('progreso-salud');

    // Referencias  de los botones
    const btnIniciar = document.getElementById('btn-iniciar');
    const btnDetener = document.getElementById('btn-detener');

    const mapa = new Mapa(25, 10, 40);
    const agente = new AgenteCC(mapa.baseX, mapa.baseY, 40);

    const dragon = new Dragon(22, 5, 40, 'dragon_sprite.png');
    //se crean las instancias
    const aliada = new Aliada(3, 3, 40);
    const brujo = new Brujo(15, 7, 40);
    const trampa = new Trampa(12, 4, 40);

    const castillo = new Castillo(1, 2, 40, 'castillo_sprite.png');
    const arboles = [
        new Arbol(15, 1, 40, 'arbol_cold.png'),
        new Arbol(9, 1, 40, 'arbol_night.png'),
        new Arbol(19, 1, 40, 'arbol_cold.png'),
        new Arbol(11, 4, 40, 'arbol_night.png'),
        new Arbol(19, 4, 40, 'arbol_cold.png'),
        new Arbol(21, 5, 40, 'arbol_night.png'),
        new Arbol(9, 6, 40, 'arbol_night.png'),

        // Bosquecito bloqueando el corredor central
        new Arbol(7, 5, 40, 'arbol_cold.png'),
        new Arbol(9, 5, 40, 'arbol_night.png'),
        new Arbol(10, 5, 40, 'arbol_night.png'),
        new Arbol(8, 6, 40, 'arbol_cold.png'),
        new Arbol(7, 6, 40, 'arbol_night.png'),
        new Arbol(10, 6, 40, 'arbol_cold.png'),

        // Lado derecho (dispersos)
        new Arbol(21, 1, 40, 'arbol_cold.png'),
        new Arbol(17, 2, 40, 'arbol_night.png'),
        new Arbol(20, 7, 40, 'arbol_cold.png'),
        new Arbol(21, 8, 40, 'arbol_night.png'),

        // L #1: fragmento detrás del castillo (1,3)
        new Arbol(0, 3, 40, 'arbol_cold.png'),
        new Arbol(0, 4, 40, 'arbol_night.png'),
        new Arbol(1, 4, 40, 'arbol_cold.png'),

        // L #2: fragmento en (7,7)
        new Arbol(6, 7, 40, 'arbol_night.png'),
        new Arbol(6, 8, 40, 'arbol_cold.png'),
        new Arbol(7, 8, 40, 'arbol_night.png'),

        // L #3: fragmento en (1,8)
        new Arbol(0, 7, 40, 'arbol_cold.png'),
        new Arbol(0, 8, 40, 'arbol_night.png'),
        new Arbol(1, 7, 40, 'arbol_night.png'),

            // Rellenar huecos visuales (zona superior-centro y otras áreas dispersas)
        new Arbol(7, 1, 40, 'arbol_night.png'),
        new Arbol(8, 1, 40, 'arbol_cold.png'),
        new Arbol(12, 3, 40, 'arbol_night.png'),
        new Arbol(16, 3, 40, 'arbol_cold.png'),
        new Arbol(23, 2, 40, 'arbol_night.png'),
        new Arbol(3, 6, 40, 'arbol_cold.png'),

            // Árboles cerca del brujo
        new Arbol(13, 6, 40, 'arbol_cold.png'),
        new Arbol(17, 6, 40, 'arbol_night.png'),
        new Arbol(13, 8, 40, 'arbol_cold.png'),
        new Arbol(17, 8, 40, 'arbol_night.png'),
        new Arbol(19, 7, 40, 'arbol_night.png'),

        new Arbol(12, 0, 40, 'arbol_cold.png'),
        new Arbol(14, 0, 40, 'arbol_night.png'),
        new Arbol(14, 1, 40, 'arbol_cold.png'),

        new Arbol(5, 0, 40, 'arbol_night.png'),
        new Arbol(4, 1, 40, 'arbol_cold.png'),
        new Arbol(5, 2, 40, 'arbol_night.png'),

        new Arbol(8, 1, 40, 'arbol_cold.png'),
        new Arbol(7, 2, 40, 'arbol_night.png'),
        new Arbol(8, 3, 40, 'arbol_cold.png'),

        new Arbol(17, 0, 40, 'arbol_night.png'),
        new Arbol(18, 1, 40, 'arbol_cold.png'),
    ];

    agente.registrarObstaculosBloqueantes([
        ...arboles.map(a => ({ x: a.x, y: a.y })),
        ...castillo.obtenerCasillasOcupadas()
    ]);

    let simulacionInterval = null;

    function actualizarInterfazUI() {
        txtEstado.textContent = agente.estado;
        txtEnergia.textContent = `${agente.energia}%`;
        progresoEnergia.style.width = `${agente.energia}%`;
        
        if (agente.energia > 50) {
            progresoEnergia.style.backgroundColor = '#22c55e';
        } else if (agente.energia > 20) {
            progresoEnergia.style.backgroundColor = '#eab308';
        } else {
            progresoEnergia.style.backgroundColor = '#ef4444';
        }

        if (txtSalud && progresoSalud) {
        txtSalud.textContent = `${agente.salud}%`;
        progresoSalud.style.width = `${agente.salud}%`;
        }

        txtFragmentos.textContent = `${agente.fragmentosRecolectados} / 10`;
        txtCargando.textContent = agente.tieneFragmento ? "Sí" : "No";
    }

    function renderizar() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        mapa.dibujar(ctx);
        castillo.dibujar(ctx);
        arboles.forEach(a => a.dibujar(ctx));
        aliada.dibujar(ctx);
        brujo.dibujar(ctx);
        agente.dibujar(ctx);
        agente.dibujarCampoVision(ctx, 'rgba(56, 189, 248, 0.25)');
        dragon.dibujar(ctx);
        trampa.dibujar(ctx);
        actualizarInterfazUI();
    }

    function cicloSimulacion() {
        if (!agente.estaMuerta) {
            const percepcion = agente.percibir(mapa, dragon);
            const accion = agente.reglaReflejo(percepcion);
            
            agente.actuar(accion, mapa);
            dragon.actualizar(agente);
            aliada.actualizar(agente);
            brujo.actualizar(agente);
            trampa.actualizar(agente);
        } else {
            dragon.animar();
        }

        actualizarInterfazUI();
        renderizar();
    }

    function iniciar() {
        if (!simulacionInterval) {
            if (agente.estado === "Dormida") {
                agente.estado = "Despertando... del largo sueño";
                renderizar();
            }

            simulacionInterval = setInterval(cicloSimulacion, 500);
            btnIniciar.disabled = true;
            btnDetener.disabled = false;
        }
    }

    function detener() {
        if (simulacionInterval) {
            clearInterval(simulacionInterval);
            simulacionInterval = null;
            
            
            agente.estado = "Tomando un descanso";
            renderizar(); 

            btnIniciar.disabled = false;
            btnDetener.disabled = true;
        }
    }

    btnIniciar.addEventListener('click', iniciar);
    btnDetener.addEventListener('click', detener);
    renderizar();
});