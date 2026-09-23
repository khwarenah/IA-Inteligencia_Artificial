// agente.js
import { TIPO_CASILLA } from './mapa.js';
import { encontrarRutaAEstrella } from './astar.js';

// Paleta de colores para C.C (Agente)
const PALETA = {
    '.': null,                  // Transparente
    'K': '#121212',             // Delineado negro
    'G': '#8cd838',             // Pelo verde C.C.
    'g': '#b4f05c',             // Brillo de pelo
    'S': '#fbe2c3',             // Piel
    'E': '#cca028',             // Ojos dorados
    'M': '#b88168',             // Sombra rostro / boca
    'W': '#ffffff',             // Traje blanco
    'D': '#3b3154'              // Detalles traje morado/rojo
};

// Sprites de C.C. en las 4 direcciones 
const SPRITES_CC = {
    'ABAJO': [
        ".....KKKKKK.....",
        "...KKGGGGGGKK...",
        "..KGGgGGGGgGGK..",
        "..KGGGGGGGGGGK..",
        "..KGGSSSSSSGGK..",
        "..KGGSEESEEGGK..",
        "..KGGSKMMKSGGK..",
        "..KGGSSSSSSGGK..",
        ".KKGGSKKKKSGGKK.",
        ".KGGGWWWWWWGGGK.",
        ".KGGGWWDDWWGGGK.",
        ".KGGGWWDDWWGGGK.",
        "..KGGWWWWWWGGK..",
        "...KKWWDDWWKK...",
        "....KWW..WWK....",
        "....KWW..WWK....",
        "....KDD..DDK....",
        "....KKK..KKK...."
    ],
    'ARRIBA': [
        ".....KKKKKK.....",
        "...KKGGGGGGKK...",
        "..KGGgGGGGgGGK..",
        "..KGGGGGGGGGGK..",
        "..KGGGGGGGGGGK..",
        "..KGGGGGGGGGGK..",
        "..KGGGGGGGGGGK..",
        "..KGGGGGGGGGGK..",
        ".KKGGGGGGGGGGKK.",
        ".KGGGWWWWWWGGGK.",
        ".KGGGWWDDWWGGGK.",
        ".KGGGWWDDWWGGGK.",
        "..KGGWWWWWWGGK..",
        "...KKWWDDWWKK...",
        "....KWW..WWK....",
        "....KWW..WWK....",
        "....KDD..DDK....",
        "....KKK..KKK...."
    ],
    'IZQUIERDA': [
        ".....KKKKKK.....",
        "...KKGGGGGGKK...",
        "..KGGgGGGGgGGK..",
        "..KGGGGGGGGGGK..",
        "..KGGSSSSSSGGK..",
        "..KGGEESSSSGGK..",
        "..KGGMMKSSSGGK..",
        "..KGGSSSSSSGGK..",
        ".KKGGSKKKKSGGKK.",
        ".KGGGWWWWWWGGGK.",
        ".KGGGWWDDWWGGGK.",
        ".KGGGWWDDWWGGGK.",
        "..KGGWWWWWWGGK..",
        "...KKWWDDWWKK...",
        "....KWW..WWK....",
        "....KWW..WWK....",
        "....KDD..DDK....",
        "....KKK..KKK...."
    ],
    'DERECHA': [
        ".....KKKKKK.....",
        "...KKGGGGGGKK...",
        "..KGGgGGGGgGGK..",
        "..KGGGGGGGGGGK..",
        "..KGGSSSSSSGGK..",
        "..KGGSSSSSSGGK..",
        "..KGGSSSSEESGGK.",
        "..KGGSSSKMMKGGK.",
        "..KGGSSSSSSGGK..",
        ".KKGGSKKKKSGGKK.",
        ".KKGGSKKKKSGGKK.",
        ".KGGGWWWWWWGGGK.",
        ".KGGGWWDDWWGGGK.",
        ".KGGGWWDDWWGGGK.",
        "..KGGWWWWWWGGK..",
        "...KKWWDDWWKK...",
        "....KWW..WWK....",
        "....KWW..WWK....",
        "....KDD..DDK....",
        "....KKK..KKK...."
    ]
};

export class AgenteCC {
    constructor(x, y, tamanoCasilla = 40) {
        this.x = x;
        this.y = y;
        this.tamanoCasilla = tamanoCasilla;
        
        //estadisticas del personaje
        this.energia = 100;
        this.tasaRecarga = 20; //cuanto recarga por turno en la base
        this.tieneFragmento = false; //lleva cristal en la mano?
        this.fragmentosRecolectados = 0;
        this.salud = 100;
        this.vidasPerdidas = 0;

        // Flags para el estado de daño persistente y respawn de 10s
        this.estaMuerta = false;
        this.turnosMensajeFuego = 0;

        this.estado = "Dormida";
        this.direccion = "ABAJO"; 

        // --- ESTRUCTURAS DE MEMORIA Y MODELO DEL MUNDO ---
        this.memoriaBase = { x: x, y: y };  // donde recuerda q esta la base
        this.posAnterior = { x: x, y: y };   // Registro de la casilla anterior inmediata (t_-1)
        this.mapaMental = {};                // Mapeo "x,y" -> { revelado, visitas, costo, tieneCristal, esZonaFuego }

        // --- PLAN DE RUTA ACTUAL (A*) ---
        // Se recalcula solo cuando hace falta, NO en cada turno, para evitar
        // que pequeños cambios de memoria hagan que el agente cambie de opinión
        // de ruta constantemente (lo que se ve como "oscilar" en el mismo lugar).
        this.rutaPlanificada = [];      // pasos pendientes de la ruta A* actual
        this.objetivoPlanificado = null; // hacia dónde apunta esa ruta
        this.objetivoCristalFijo = null; // cristal "bloqueado": no cambia solo porque otro esté un poco más cerca

        // --- ESTADO DE LOS 5 SENTIDOS ACTUALES ---
        //se muestra en el panel UI
        this.sentidosActuales = {
            vista: "Inactivo",
            oido: "Inactivo",
            olfato: "Inactivo",
            tacto: "Inactivo",
            gusto: "Inactivo"
        };
    }

    //traduce un movimiento(dx,dy) a una direccion con nombre
    //para saber q sprite dibujar
    actualizarDireccion(dx, dy) {
        const MAPA_DIRECCIONES = {
            '0,-1': 'ARRIBA',
            '0,1':  'ABAJO',
            '-1,0': 'IZQUIERDA',
            '1,0':  'DERECHA'
        };
        const nuevaDir = MAPA_DIRECCIONES[`${dx},${dy}`];
        if (nuevaDir) {
            this.direccion = nuevaDir;
        }
    }

    // Metodos para daño de guego y respawn
    //le resta salud y si llega a 0 se va a respawn
    //lo usan el dragon, brujo y trampa
    recibirDpsFuego(puntos, origenX, origenY, radioPeligro = 1) {
        if (this.estaMuerta) return;

        this.salud = Math.max(0, this.salud - puntos);
        this.turnosMensajeFuego = 3; // Mantiene el aviso visible en UI por 3 turnos

        //si ya se sabe de donde vino el daño, marca esa zona
        //y sus alrededores como peligrosa en la memoria
        if (origenX !== undefined && origenY !== undefined) {
            this.registrarZonaPeligro(origenX, origenY, radioPeligro);
        }

        if (this.salud <= 0) {
            this.iniciarRespawnLento();
        } else {
            this.estado = `¡C.C esta recibiendo daño por fuego! Salud: ${this.salud}%`;
        }
    }

    // Alias son nombre mas generico
    //lo usan brujo.js y trampa.js
    recibirDano(puntos, origenX, origenY, radioPeligro = 1) {
        this.recibirDpsFuego(puntos, origenX, origenY, radioPeligro);
    }

    //cuando la salud llega a 0: la marca como muerta 10 seg
    //con setTimeout y la hace reaparecer en base
    iniciarRespawnLento() {
        this.estaMuerta = true;
        this.salud = 0;
        this.estado = "¡C.C. ha sido incinerada por el fuego del Dragon! Reapareciendo en 10 segundos...";

        //Pausar 10 segundos antes de reaparecer
        setTimeout(() => {
            this.reaparecer();
            this.estaMuerta = false;
        }, 10000);
    }

    reaparecer() {
        this.vidasPerdidas++;
        this.x = this.memoriaBase.x;
        this.y = this.memoriaBase.y;
        this.salud = 100;
        this.energia = 100;
        this.tieneFragmento = false;
        this.posAnterior = { x: this.x, y: this.y };
        this.estado = `C.C Murio. Reapareciendo en el Altar (Caídas: ${this.vidasPerdidas})`;
    }

    //marca un area cuadrada (centro + radio)
    //como zona peligrosa en la memoria
    //esto es lo q usan los malos para
    //enseñarle a cc donde no pasar
    registrarZonaPeligro(centerX, centerY, radio = 2) {
        for (let dy = -radio; dy <= radio; dy++) {
            for (let dx = -radio; dx <= radio; dx++) {
                const px = centerX + dx;
                const py = centerY + dy;
                const clave = `${px},${py}`;
                if (!this.mapaMental[clave]) {
                    this.mapaMental[clave] = {
                        revelado: true,
                        visitas: 0,
                        costo: 0.5,
                        tieneCristal: false,
                        esZonaFuego: true
                    };
                } else {
                    this.mapaMental[clave].esZonaFuego = true;
                }
            }
        }
    }

    // 5 Sentidos para el Agente
    //revisa las 8 casillas alrededor cuadro de 3x3 centrado en cc
    //si detecta a dragon marca la zona
    percibirVista(mapa, dragon) {
        const observacion = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = this.x + dx;
                const ny = this.y + dy;

                if (nx >= 0 && nx < mapa.columnas && ny >= 0 && ny < mapa.filas) {
                    const detectaDragon = dragon && dragon.ocupaCasilla ? dragon.ocupaCasilla(nx, ny) : false;
                    
                    observacion.push({
                        x: nx,
                        y: ny,
                        contenido: mapa.grid[ny][nx],
                        hayDragon: detectaDragon
                    });

                    if (detectaDragon) {
                        this.registrarZonaPeligro(nx, ny, 1);
                    }
                }
            }
        }
        return observacion;
    }

    // Oído utilizando la Distancia Manhattan al Altar Base 3 niveles de volumen
    percibirOido(mapa) {
        const baseX = mapa?.baseX ?? this.memoriaBase.x;
        const baseY = mapa?.baseY ?? this.memoriaBase.y;
        
        // Cálculo de pasos rectos (Manhattan)
        const d = Math.abs(this.x - baseX) + Math.abs(this.y - baseY);

        // Selección de nivel declarativa (cero if/else)
        const nivel = (d <= 2 && 'FUERTE') || (d <= 5 && 'MEDIO') || 'DEBIL';

        return { 
            nivel: nivel, 
            distancia: d,
            descripcion: `Resonancia ${nivel} (${d} casillas del Altar)`
        };
    }

    // Olfato utilizando la Gradiente Inverso al Fragmento de espejo más cercano
    percibirOlfato(mapa) {
        const grid = mapa?.grid || [];
        const fragmentos = [];

        // Localiza las posiciones de los fragmentos en la cuadrícula
        grid.forEach((row, r) => {
            row.forEach((val, c) => {
                (val === TIPO_CASILLA.FRAGMENTO) && fragmentos.push({ x: c, y: r });
            });
        });

        const sinFragmentos = fragmentos.length === 0;
        const distancias = fragmentos.map(f => Math.abs(this.x - f.x) + Math.abs(this.y - f.y));
        const menorDistancia = sinFragmentos ? Infinity : Math.min(...distancias);
        const intensidad = sinFragmentos ? 0 : Number((1 / (menorDistancia + 1)).toFixed(2));

        return {
            intensidad: intensidad,
            distancia: menorDistancia,
            objetivo: sinFragmentos ? null : fragmentos[distancias.indexOf(menorDistancia)],
            descripcion: sinFragmentos 
                ? 'Sin fragmentos en el mapa' 
                : `Intensidad ${intensidad} (Cristal a ${menorDistancia} cas)`
        };
    }
    //que terreno pisa y cuanta energia le cuesta moverse
    percibirTacto(mapa) {
        const casillaActual = mapa.grid[this.y][this.x];
        
        // Normal: 0.5 | Hielo: 2 | Nieve: 4
        let costoTerreno = 0.5;
        let tipoNombre = "Normal";
        if (casillaActual === TIPO_CASILLA.NIEVE) {
            costoTerreno = 4;
            tipoNombre = "Nieve (Alta resistencia)";
        } else if (casillaActual === TIPO_CASILLA.HIELO) {
            costoTerreno = 2;
            tipoNombre = "Hielo (Resistencia media)";
        }

        return {
            casillaActual,
            costoMovimiento: costoTerreno,
            tipoNombre,
            puedoMovermeA: (nx, ny) => (nx >= 0 && nx < mapa.columnas && ny >= 0 && ny < mapa.filas)
        };
    }
    //detecta si esta en la base y cuanta energia recargaria
    percibirGusto(mapa) {
        const enBase = (this.x === mapa.baseX) && (this.y === mapa.baseY);
        const eficiencia = enBase ? 1.0 : 0.0;
        const recargaPosible = Math.min(100 - this.energia, this.tasaRecarga * eficiencia);

        return {
            enBase: enBase,
            eficiencia: eficiencia,
            energiaARecargar: recargaPosible,
            descripcion: enBase 
                ? `Sabor místico: Absorbiendo energía (+${recargaPosible})` 
                : 'Sabor insípido: Fuera del Altar'
        };
    }
    
    //junta los 5 sentidos en un solo objeto percibir
    //y actualiza la memoria con lo q percibio
    //se llama una vez por turno
    percibir(mapa, dragon) {
        if (this.estaMuerta) return null;

        const casillaActual = mapa.grid[this.y][this.x];
        const percepcion = {
            hayFragmento: casillaActual === TIPO_CASILLA.FRAGMENTO,
            enBase: casillaActual === TIPO_CASILLA.BASE_ESPEJO,
            energiaIncompleta: this.energia < 100,

            vista: this.percibirVista(mapa, dragon),
            oido: this.percibirOido(mapa),
            olfato: this.percibirOlfato(mapa),
            tacto: this.percibirTacto(mapa),
            gusto: this.percibirGusto(mapa)
        };

        // Actualizar resumen textual de los 5 sentidos actuales
        this.sentidosActuales = {
            vista: `Escaneando cuadrante 3x3 (${percepcion.vista.length} casillas observadas)`,
            oido: percepcion.oido.descripcion,
            olfato: percepcion.olfato.descripcion,
            tacto: `Terreno: ${percepcion.tacto.tipoNombre} - Costo: ${percepcion.tacto.costoMovimiento}`,
            gusto: percepcion.gusto.descripcion
        };

        // Procesa la percepción e integra el estado del mapa en el modelo mental
        this.actualizarMemoria(percepcion, mapa);
        return percepcion;
    }

    // guarda lo q percibio en (mapaMental)
    //marca cada casilla vista con su costo,
    //si tiene cristal, si hay peligro y cuenta las
    //visitas a la casilla actual

    actualizarMemoria(percepcion, mapa) {
        // Guarda la ubicación exacta de la base si está sobre ella o la registra del mapa
        if (mapa?.baseX !== undefined && mapa?.baseY !== undefined) {
            this.memoriaBase = { x: mapa.baseX, y: mapa.baseY };
        } else if (percepcion.enBase) {
            this.memoriaBase = { x: this.x, y: this.y };
        }

        // Registra las casillas observadas en el área de visión (3x3)
        percepcion.vista.forEach(casilla => {
            const clave = `${casilla.x},${casilla.y}`;
            let costo = 0.5;
            if (casilla.contenido === TIPO_CASILLA.NIEVE) costo = 4;
            else if (casilla.contenido === TIPO_CASILLA.HIELO) costo = 2;

            if (!this.mapaMental[clave]) {
                this.mapaMental[clave] = {
                    revelado: true,
                    visitas: 0,
                    costo: costo,
                    tieneCristal: casilla.contenido === TIPO_CASILLA.FRAGMENTO,
                    esZonaFuego: casilla.hayDragon || false
                };
            } else {
                this.mapaMental[clave].tieneCristal = (casilla.contenido === TIPO_CASILLA.FRAGMENTO);
                if (casilla.hayDragon) this.mapaMental[clave].esZonaFuego = true;
            }
        });

        // Incrementa el contador de pisadas de la casilla en la que se ubica C.C.
        const claveActual = `${this.x},${this.y}`;
        if (this.mapaMental[claveActual]) {
            this.mapaMental[claveActual].visitas += 1;
        }
    }

    // Reglas de decisión del Agente

    reglaReflejo(percepcion) {
        if (this.estaMuerta) return 'ESPERANDO_RESPAWN';
        if (this.energia <= 0) {
            return 'SIN_ENERGIA';
        }
        if (percepcion.hayFragmento && !this.tieneFragmento) {
            return 'RECOGER_FRAGMENTO';
        }
        if (percepcion.enBase && this.tieneFragmento) {
            return 'DEPOSITAR_FRAGMENTO';
        }
        if (percepcion.enBase && percepcion.energiaIncompleta) {
            return 'RECARGAR';
        }

        // Prioridad Absoluta de Retorna en caso que la energía sea <= 40% O lleva un cristal en mano, regresa a la base inmediatamente
        if ((this.energia <= 40 || this.tieneFragmento) && !percepcion.enBase) {
            return 'REGRESAR_A_BASE';
        }

        return 'EXPLORAR_INTELIGENTE';
    }

    // Ponderación heurística para la toma de decisión del próximo paso
    //mientras mas bajo el puntaje, mejor la opcion
    //suma varios factores segun lo q recuerda de esa casilla
    evaluarMovimiento(nx, ny, objetivo, modoAccion) {
        const clave = `${nx},${ny}`;
        const infoMemoria = this.mapaMental[clave];

        // Costos según terreno (Normal: 0.5 | Hielo: 2 | Nieve: 4)
        let pesoTerreno = infoMemoria?.costo || 0.5;

        // Penalización por presencia de fuego / amenaza del dragón
        let pesoZonaFuego = infoMemoria?.esZonaFuego ? 40 : 0;

        // Penalización t_-1 para prevenir oscilación inmediata hacia el paso anterior
        const esRegresoInmediato = (nx === this.posAnterior.x && ny === this.posAnterior.y);
        let pesoHistorial = esRegresoInmediato ? 15 : 0;

        // Aplicando la distancia Manhattan hacia el objetivo
        let distObjetivo = 0;
        if (objetivo) {
            distObjetivo = Math.abs(nx - objetivo.x) + Math.abs(ny - objetivo.y);
        }

        // Modo para retornar a la base
        if (modoAccion === 'REGRESAR_A_BASE') {
            // En modo retorno a base, la atracción hacia la base domina sobre todo.
            // Se desactiva la penalización por repetición y el bono de exploración para no desviarse.
            return pesoTerreno + pesoHistorial + pesoZonaFuego + (distObjetivo * 30);
        }

        // --- MODO: EXPLORACIÓN / BÚSQUEDA ---
        const numVisitas = infoMemoria?.visitas || 0;
        let pesoRepeticion = numVisitas * 12; // Resistencia a repisar casillas
        let bonoInexplorado = (!infoMemoria || !infoMemoria.revelado) ? -8 : 0; // Incentivo a casillas desconocidas

        return pesoTerreno + pesoHistorial + pesoZonaFuego + pesoRepeticion + bonoInexplorado + (distObjetivo * 2);
    }

    /**
     * Costo de ENTRAR a la casilla (nx, ny) según lo que el agente RECUERDA
     * (mapaMental), no según el mapa real. Es el mismo modelo de costos que
     * ya usaba evaluarMovimiento(): terreno conocido (o 0.5 por defecto si
     * nunca la ha visitado/observado) más una fuerte penalización si es una
     * zona de peligro conocida (fuego del dragón, trampas ya activadas, etc.).
     */
    costoParaAEstrella(nx, ny) {
        const clave = `${nx},${ny}`;
        const infoMemoria = this.mapaMental[clave];

        const costoTerreno = infoMemoria?.costo ?? 0.5;       // 0.5 por defecto: lo más optimista si no la conoce
        const penalizacionPeligro = infoMemoria?.esZonaFuego ? 40 : 0;

        return costoTerreno + penalizacionPeligro;
    }

    /**
     * Planifica con A* la ruta completa desde la posición actual hasta
     * "objetivo", usando costoParaAEstrella (es decir, la memoria del
     * agente) en vez del mapa real. Devuelve el camino (sin la posición
     * actual) o null si no encuentra ruta con lo que sabe hasta ahora.
     */
    planificarRutaAEstrella(mapa, objetivo) {
        return encontrarRutaAEstrella(
            mapa,
            { x: this.x, y: this.y },
            objetivo,
            (nx, ny) => this.costoParaAEstrella(nx, ny),
            0.5 // costo mínimo posible de cualquier casilla (terreno normal), para la heurística admisible
        );
    }

    seleccionarMejorPaso(mapa, objetivo, modoAccion) {
        const direcciones = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];

        let mejorOpcion = null;
        let menorPuntaje = Infinity;

        for (const dir of direcciones) {
            const nx = this.x + dir.dx;
            const ny = this.y + dir.dy;

            if (nx >= 0 && nx < mapa.columnas && ny >= 0 && ny < mapa.filas) {
                const puntaje = this.evaluarMovimiento(nx, ny, objetivo, modoAccion);
                if (puntaje < menorPuntaje) {
                    menorPuntaje = puntaje;
                    mejorOpcion = { nx, ny, dx: dir.dx, dy: dir.dy };
                }
            }
        }

        return mejorOpcion;
    }

    actuar(accion, mapa) {
        if (this.estaMuerta) return;

        switch (accion) {
            case 'SIN_ENERGIA':
                this.estado = "la Agente t0 C.C. ha entrado en un letargo eterno.";
                console.log("la Agente t0 C.C. ha entrado en un letargo eterno.");
                break;

            case 'RECOGER_FRAGMENTO':
                this.tieneFragmento = true;
                mapa.grid[this.y][this.x] = TIPO_CASILLA.VACIA;
                if (this.mapaMental[`${this.x},${this.y}`]) {
                    this.mapaMental[`${this.x},${this.y}`].tieneCristal = false;
                }
                this.objetivoCristalFijo = null; // ya lo recogió: libera el "bloqueo" para elegir uno nuevo después
                this.rutaPlanificada = [];
                this.objetivoPlanificado = null;
                this.estado = "C.C. recupero un fragmento de espejo y lo esta devolviendo al altar.";
                console.log("C.C. recupero un fragmento de espejo.");
                break;

            case 'DEPOSITAR_FRAGMENTO':
                this.tieneFragmento = false;
                this.fragmentosRecolectados++;
                console.log(`C.C. deposito un fragmento en el altar. Total: ${this.fragmentosRecolectados}`);
                break;

            case 'RECARGAR':
                this.energia = Math.min(100, this.energia + this.tasaRecarga);
                this.estado = `Utilizando el sabor de la energía en el altar para recuperar energía (${this.energia}%)`;
                console.log(`La agente C.C. esta recuperando energia en el altar. Energia actual: ${this.energia}%`);
                break;

            case 'REGRESAR_A_BASE':
            case 'EXPLORAR_INTELIGENTE': {
                // Guarda la posición actual como t_-1 antes de desplazarse
                this.posAnterior = { x: this.x, y: this.y };

                // Establece el objetivo según la prioridad del estado
                let objetivo = null;
                if (accion === 'REGRESAR_A_BASE') {
                    objetivo = this.memoriaBase;
                    const razon = this.tieneFragmento ? "Transportando cristal" : "Energía <= 40%";
                    this.estado = `Usando A* (guiado por el Oído) para volver al Altar (${razon}) | Energía: ${this.energia}%`;
                } else {
                    // Si ya teníamos un cristal FIJADO como objetivo y sigue ahí
                    // (nadie lo ha recogido), seguimos yendo por ÉL. No lo cambiamos
                    // solo porque, por distancia Manhattan pura, otro cristal haya
                    // quedado momentáneamente un poco más cerca: eso era lo que
                    // causaba el ir-y-venir (el "objetivo más cercano" cambiaba de
                    // opinión cada turno entre dos cristales casi equidistantes).
                    const fijoSigueValido = this.objetivoCristalFijo
                        && mapa.grid[this.objetivoCristalFijo.y][this.objetivoCristalFijo.x] === TIPO_CASILLA.FRAGMENTO;

                    if (fijoSigueValido) {
                        objetivo = this.objetivoCristalFijo;
                        this.estado = `Usando A* (guiado por el Olfato) hacia el cristal fijado en (${objetivo.x}, ${objetivo.y})`;
                    } else {
                        const olfato = this.percibirOlfato(mapa);
                        if (olfato.objetivo) {
                            objetivo = olfato.objetivo;
                            this.objetivoCristalFijo = olfato.objetivo; // se fija hasta que se recoja o desaparezca
                            this.estado = `Usando A* (guiado por el Olfato) hacia un cristal nuevo (Distancia: ${olfato.distancia})`;
                        } else {
                            this.objetivoCristalFijo = null;
                            this.estado = "Utilizando la Vista para la inspección de casillas no visitadas anteriormente.";
                        }
                    }
                }

                let paso = null;

                if (objetivo) {
                    // ¿Seguimos persiguiendo el mismo objetivo que la vez pasada?
                    const objetivoCambio = !this.objetivoPlanificado
                        || this.objetivoPlanificado.x !== objetivo.x
                        || this.objetivoPlanificado.y !== objetivo.y;

                    // ¿El siguiente paso que ya teníamos planeado resultó ser peligroso
                    // (por ejemplo, acabamos de "ver" al dragón ahí)? Si es así, sí vale
                    // la pena replanificar antes de pisarlo.
                    const siguientePlaneado = this.rutaPlanificada[0];
                    const pasoPlaneadoInvalido = siguientePlaneado
                        && this.mapaMental[`${siguientePlaneado.x},${siguientePlaneado.y}`]?.esZonaFuego;

                    // Solo llamamos a A* si de verdad hace falta: objetivo nuevo,
                    // no nos queda ruta pendiente, o el siguiente paso ya no es seguro.
                    // Así el agente COMMITEA a un plan en vez de replanificar cada
                    // turno (que es justo lo que provocaba que "oscilara" en el mismo lugar).
                    if (objetivoCambio || this.rutaPlanificada.length === 0 || pasoPlaneadoInvalido) {
                        this.rutaPlanificada = this.planificarRutaAEstrella(mapa, objetivo) || [];
                        this.objetivoPlanificado = objetivo;
                    }

                    if (this.rutaPlanificada.length > 0) {
                        const siguiente = this.rutaPlanificada.shift();
                        paso = {
                            nx: siguiente.x,
                            ny: siguiente.y,
                            dx: siguiente.x - this.x,
                            dy: siguiente.y - this.y
                        };
                    }
                } else {
                    // Sin destino conocido todavía: A* no tiene a dónde apuntar,
                    // así que seguimos explorando con la heurística local de siempre.
                    this.rutaPlanificada = [];
                    this.objetivoPlanificado = null;
                    paso = this.seleccionarMejorPaso(mapa, null, accion);
                }

                if (paso) {
                    this.actualizarDireccion(paso.dx, paso.dy);
                    this.x = paso.nx;
                    this.y = paso.ny;

                    // Calcula y descuenta el costo real según la casilla pisada
                    const tactoActual = this.percibirTacto(mapa);
                    this.energia = Math.max(0, this.energia - tactoActual.costoMovimiento);
                }
                break;
            }
        }

        // Alerta de Fuego
        if (this.turnosMensajeFuego > 0) {
            this.turnosMensajeFuego--;
            this.estado = `FUEGO🔥!!!!!!! [EN ZONA DE FUEGO - HP: ${this.salud}%] ` + this.estado;
        }
    }

    dibujar(ctx) {
        if (this.estaMuerta) return;

        const posX = this.x * this.tamanoCasilla;
        const posY = this.y * this.tamanoCasilla;

        // Resplandor si lleva un fragmento de espejo
        if (this.tieneFragmento) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.fillRect(posX, posY, this.tamanoCasilla, this.tamanoCasilla);
        }

        // Selección dinámica de la matriz sprite según la orientación actual
        const spriteActual = SPRITES_CC[this.direccion] || SPRITES_CC['ABAJO'];
        const filas = spriteActual.length;
        const cols = spriteActual[0].length;
        const tamPixel = 2; 

        // Centrado del personaje en la casilla
        const offsetX = posX + (this.tamanoCasilla - (cols * tamPixel)) / 2;
        const offsetY = posY + (this.tamanoCasilla - (filas * tamPixel)) / 2;

        // Recorrido de la matriz para pintar píxel por píxel
        for (let r = 0; r < filas; r++) {
            for (let c = 0; c < cols; c++) {
                const charColor = spriteActual[r][c];
                const colorHex = PALETA[charColor];

                if (colorHex) {
                    ctx.fillStyle = colorHex;
                    ctx.fillRect(
                        offsetX + (c * tamPixel),
                        offsetY + (r * tamPixel),
                        tamPixel,
                        tamPixel
                    );
                }
            }
        }
    }

    dibujarCampoVision(ctx, color = 'rgba(56, 189, 248, 0.25)') {
        if (this.estaMuerta) return;

        const tam = this.tamanoCasilla;
        const inicioX = (this.x - 1) * tam;
        const inicioY = (this.y - 1) * tam;
        const dimension = tam * 3;

        ctx.save();
        ctx.fillStyle = color;
        ctx.fillRect(inicioX, inicioY, dimension, dimension);

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(inicioX, inicioY, dimension, dimension);
        ctx.restore();
    }
}