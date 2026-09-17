import { Mapa } from './mapa.js';
import { AgenteCC } from './agente.js';

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

    // Referencias  de los botones
    const btnIniciar = document.getElementById('btn-iniciar');
    const btnDetener = document.getElementById('btn-detener');

    const mapa = new Mapa(10, 10, 40);
    const agente = new AgenteCC(mapa.baseX, mapa.baseY, 40);

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

        txtFragmentos.textContent = `${agente.fragmentosRecolectados} / 10`;
        txtCargando.textContent = agente.tieneFragmento ? "Sí" : "No";
    }

    function renderizar() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        mapa.dibujar(ctx);
        agente.dibujarRastro(ctx); // huella de casillas ya visitadas (memoria del agente)
        agente.dibujar(ctx);
        actualizarInterfazUI();
    }

    function cicloSimulacion() {
        const percepcion = agente.percibir(mapa);
        const accion = agente.reglaReflejo(percepcion);
        agente.actuar(accion, mapa);

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