// agente.js
import { TIPO_CASILLA } from './mapa.js';
import { calcularRuta } from './pathfinding.js';

//  de colores para C.C (Agente)
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

//  Sprite de C.C. 
// Matriz para dibujar al agente
const SPRITE_CC = [
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
];

export class AgenteCC {
    constructor(x, y, tamanoCasilla = 40) {
        this.x = x;
        this.y = y;
        this.tamanoCasilla = tamanoCasilla;
        
        this.energia = 100;
        this.tasaRecarga = 20;
        this.tieneFragmento = false;
        this.fragmentosRecolectados = 0;

        this.estado = "Dormida";

        this.visitadas = new Set();  // memoria: casillas por donde ya ha pasado
        this.ruta = [];              // camino actual calculado por A* (easystarjs)
        this.destinoActual = null;   // {x, y} hacia donde apunta la ruta actual

        this.radioVision = 1;              // qué tan lejos "ve" el agente (sensor limitado)
        this.fragmentosConocidos = new Map(); // memoria: fragmentos que ha descubierto

        this.marcarVisitada();
    }

    /** Registra la casilla actual como visitada (memoria del agente). */
    marcarVisitada() {
        this.visitadas.add(`${this.x},${this.y}`);
    }

    /**
     * Calcula, usando A* (easystarjs), la ruta desde la posición actual
     * hasta "destino" = {x, y}, y la guarda en this.ruta.
     */
    planificarRuta(mapa, destino) {
        const ruta = calcularRuta(mapa, { x: this.x, y: this.y }, destino);
        // Quitamos el primer punto: es la posición donde ya estamos.
        this.ruta = ruta ? ruta.slice(1) : [];
    }

    /**
     * Avanza un paso sobre this.ruta (la calculada por planificarRuta).
     * Devuelve true si se movió, false si no había ruta pendiente.
     */
    seguirRuta() {
        if (this.ruta.length === 0) return false;

        const siguiente = this.ruta.shift();
        this.x = siguiente.x;
        this.y = siguiente.y;
        this.energia -= 1;
        this.marcarVisitada();
        return true;
    }

    /**
     * Busca, entre los fragmentos que el agente YA HA DESCUBIERTO (memoria),
     * el más cercano a su posición actual. Ya no escanea todo el mapa: solo
     * conoce lo que su propio sensor (percibir) ha detectado antes.
     * @returns {{x:number, y:number}|null} posición del fragmento conocido más cercano, o null si no conoce ninguno.
     */
    elegirFragmentoMasCercano() {
        if (this.fragmentosConocidos.size === 0) return null;

        let masCercano = null;
        let menorDistancia = Infinity;
        for (const f of this.fragmentosConocidos.values()) {
            const distancia = Math.abs(f.x - this.x) + Math.abs(f.y - this.y);
            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                masCercano = f;
            }
        }
        return masCercano;
    }

    /**
     * Elige la siguiente casilla para explorar cuando el agente aún no conoce
     * ningún fragmento. Usa this.visitadas para preferir casillas nuevas
     * en vez de repetir camino ya recorrido (aquí es donde la memoria de
     * "por dónde ha pasado" finalmente se aprovecha).
     */
    explorar(mapa) {
        const direcciones = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];

        const vecinosValidos = direcciones
            .map(d => ({ x: this.x + d.dx, y: this.y + d.dy }))
            .filter(p => p.x >= 0 && p.x < mapa.columnas && p.y >= 0 && p.y < mapa.filas);

        // Preferimos casillas NO visitadas; si ya conocemos todas las vecinas, elegimos cualquiera.
        const noVisitadas = vecinosValidos.filter(p => !this.visitadas.has(`${p.x},${p.y}`));
        const candidatos = noVisitadas.length > 0 ? noVisitadas : vecinosValidos;

        const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
        this.x = elegido.x;
        this.y = elegido.y;
        this.energia -= 1;
        this.marcarVisitada();
    }

    // Percepcion del agente
    // La funcion de este metodo es actuar como los ojos del agente, extrae informacion del entorno en el instante de cada ciclo. Siempre en el ahora

    // const casillaActual = mapa.grid[this.y][this.x]; Esta funcion toma la matriz del mapa utilizando las coordenadas (x, y) donde se encuentra el agente
    //actualmente para saber que elemento u objeto hay en una casilla en especifico.

    //return { ... }; - Devuelve el estado de un objeto en valores booleanos
    //hayFragmento: - true si la casilla actual contiene un fragmento de espejo.
    //enBase: true si C.C.(Agente) - esta parada sobre la casilla del altar central.
    //energiaBaja: true - estado de la energia

    percibir(mapa) {
        const casillaActual = mapa.grid[this.y][this.x];

        // --- Sensor local ---
        // El agente ya NO consulta todo mapa.grid para saber dónde están los
        // fragmentos. Solo "ve" dentro de un radio pequeño a su alrededor
        // (this.radioVision). Lo que descubre aquí se guarda en su memoria
        // (fragmentosConocidos), así que el conocimiento se construye poco a
        // poco con la experiencia, no de golpe como un oráculo.
        for (let dy = -this.radioVision; dy <= this.radioVision; dy++) {
            for (let dx = -this.radioVision; dx <= this.radioVision; dx++) {
                const nx = this.x + dx;
                const ny = this.y + dy;
                if (nx < 0 || nx >= mapa.columnas || ny < 0 || ny >= mapa.filas) continue;

                if (mapa.grid[ny][nx] === TIPO_CASILLA.FRAGMENTO) {
                    this.fragmentosConocidos.set(`${nx},${ny}`, { x: nx, y: ny });
                }
            }
        }

        return {
            hayFragmento: casillaActual === TIPO_CASILLA.FRAGMENTO,
            enBase: casillaActual === TIPO_CASILLA.BASE_ESPEJO,
            energiaIncompleta: this.energia < 100
        };
    }




    // reglaReflejo(percepcion) - Es el nucleo del Agente T0. Recibe los datos de percepcion 
    //Es el núcleo conceptual del Agente de Reflejo Simple. Recibe el paquete de datos creado por percibir() y aplica una tabla estricta de reglas de prioridad mediante declaraciones if:



    reglaReflejo(percepcion) {
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

        // Si lleva un fragmento, la base siempre se conoce (es su "hogar"),
        // así que puede volver directo con A*.
        if (this.tieneFragmento) {
            return 'MOVER_HACIA_OBJETIVO';
        }

        // Si no lleva fragmento: solo puede dirigirse con A* a uno que
        // YA CONOZCA. Si no conoce ninguno todavía, tiene que explorar.
        if (this.fragmentosConocidos.size > 0) {
            return 'MOVER_HACIA_OBJETIVO';
        }
        return 'EXPLORAR';
    }

    // Acciones que realiza el agente
    actuar(accion, mapa) {
        switch (accion) {
            case 'SIN_ENERGIA':
            this.estado = "la Agente t0 C.C. ha entrado en un letargo eterno.";
            console.log("la Agente t0 C.C.ha entrado en un letargo eterno.");
            break;

            case 'RECOGER_FRAGMENTO':
                this.tieneFragmento = true;
                mapa.grid[this.y][this.x] = TIPO_CASILLA.VACIA;
                this.fragmentosConocidos.delete(`${this.x},${this.y}`); // ya no está disponible
                console.log("C.C. recupero un fragmento de espejo.");
                break;

            case 'DEPOSITAR_FRAGMENTO':
                this.tieneFragmento = false;
                this.fragmentosRecolectados++;
                console.log(`C.C. deposito un fragmento en el altar. Total: ${this.fragmentosRecolectados}`);
                break;

            case 'RECARGAR':
                this.energia = Math.min(100, this.energia + this.tasaRecarga);
                this.estado = `La agente C.C. esta recuperando energia en el altar. (${this.energia}%)`;
                console.log(`La agente C.C. esta recuperando energia en el altar. Energia actual: ${this.energia}%`);
                break;

            case 'EXPLORAR':
                this.explorar(mapa);
                this.estado = "Explorando el mapa (aún no conoce fragmentos)";
                break;

            case 'MOVER_HACIA_OBJETIVO': {
                // El objetivo depende de si ya lleva un fragmento o no:
                // con fragmento -> volver a la base; sin fragmento -> el
                // fragmento conocido más cercano (no el más cercano del mapa entero).
                const destino = this.tieneFragmento
                    ? { x: mapa.baseX, y: mapa.baseY }
                    : this.elegirFragmentoMasCercano();

                if (!destino) {
                    this.estado = "No quedan fragmentos por recolectar";
                    break;
                }

                // Solo recalculamos la ruta con A* si no hay una activa,
                // o si el objetivo cambió (por ejemplo, acaba de recoger un fragmento).
                const cambioDeObjetivo = !this.destinoActual
                    || this.destinoActual.x !== destino.x
                    || this.destinoActual.y !== destino.y;

                if (this.ruta.length === 0 || cambioDeObjetivo) {
                    this.planificarRuta(mapa, destino);
                    this.destinoActual = destino;
                }

                this.seguirRuta();
                this.estado = this.tieneFragmento
                    ? "Regresando a la base con un fragmento (A*)"
                    : "Yendo por el fragmento más cercano (A*)";
                break;
            }
        }
    }

    /**
     * Dibuja un rastro visual (huella) sobre todas las casillas que el agente
     * ya ha visitado (this.visitadas). Debe llamarse ANTES de agente.dibujar(),
     * y DESPUÉS de mapa.dibujar(), para que quede debajo del sprite pero sobre
     * el piso/fragmentos.
     */
    dibujarRastro(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(148, 163, 184, 0.18)'; // gris tenue y semitransparente
        for (const clave of this.visitadas) {
            const [x, y] = clave.split(',').map(Number);
            ctx.fillRect(
                x * this.tamanoCasilla,
                y * this.tamanoCasilla,
                this.tamanoCasilla,
                this.tamanoCasilla
            );
        }
        ctx.restore();
    }

    // Renderizado del agente en el canvas
    dibujar(ctx) {
        const posX = this.x * this.tamanoCasilla;
        const posY = this.y * this.tamanoCasilla;

        // Resplandor en caso de que lleve un fragmento de espejo
        if (this.tieneFragmento) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.fillRect(posX, posY, this.tamanoCasilla, this.tamanoCasilla);
        }

        const filas = SPRITE_CC.length;
        const cols = SPRITE_CC[0].length;
        
        // Calcula el tamaño de cada "píxel" dentro de la casilla de 40px
        const tamPixel = 2; 

        // Centrado del personaje en la casilla
        const offsetX = posX + (this.tamanoCasilla - (cols * tamPixel)) / 2;
        const offsetY = posY + (this.tamanoCasilla - (filas * tamPixel)) / 2;

        // Recorrido de la matriz para pintar pixel por pixel
        for (let r = 0; r < filas; r++) {
            for (let c = 0; c < cols; c++) {
                const charColor = SPRITE_CC[r][c];
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
}