import { Mapa } from './mapa.js';
import { AgenteCC } from './agente.js';
import { Dragon } from './dragon.js';
import { Aliada } from './aliada.js';
import { Brujo } from './brujo.js';
import { Trampa } from './trampa.js';

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
        aliada.dibujar(ctx);
        brujo.dibujar(ctx);
        agente.dibujar(ctx);
        agente.dibujarCampoVision(ctx, 'rgba(56, 189, 248, 0.25)');
        dragon.dibujar(ctx);
        trampa.dibujar(ctx);
        actualizarInterfazUI();
    }

    // function cicloSimulacion() {
    //     const percepcion = agente.percibir(mapa);
    //     //console.log(" [TACTO]:", agente.percibirTacto(mapa));
    //     //console.log(" [OÍDO]:", agente.percibirOido(mapa));
    //     //console.log("   [OLFATO]:", percepcion.olfato);
    //     //console.log(" [GUSTO]:", percepcion.gusto);
    //     const accion = agente.reglaReflejo(percepcion);
    //     agente.actuar(accion, mapa);

    //     dragon.actualizar(agente);

    //     renderizar();
    // }

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