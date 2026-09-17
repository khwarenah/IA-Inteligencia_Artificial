// agente.js
import { TIPO_CASILLA } from './mapa.js';

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

        // --- NUEVA MEMORIA DEL AGENTE ---
        this.visitados = new Set(); // Guarda coordenadas visitadas: "x,y"
        this.obstaculos = new Set(); // Guarda coordenadas de obstáculos: "x,y"
        
        // Registrar la posición inicial en la memoria
        this.visitados.add(`${this.x},${this.y}`);
      
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
        return 'MOVER_ALEATORIO';
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

            case 'MOVER_ALEATORIO':
                const direcciones = [
                    { dx: 0, dy: -1 },
                    { dx: 0, dy: 1 },
                    { dx: -1, dy: 0 },
                    { dx: 1, dy: 0 }
                ];
                // 1. Filtrar direcciones que están dentro del mapa y NO son obstáculos conocidos
    const movimientosValidos = direcciones.filter(d => {
        const nuevoX = this.x + d.dx;
        const nuevoY = this.y + d.dy;
        const claveCoordenada = `${nuevoX},${nuevoY}`;

        const dentroDeLimites = nuevoX >= 0 && nuevoX < mapa.columnas && nuevoY >= 0 && nuevoY < mapa.filas;
        const esObstaculoConocido = this.obstaculos.has(claveCoordenada);

        return dentroDeLimites && !esObstaculoConocido;
    });

    if (movimientosValidos.length === 0) {
        // Si está completamente rodeado, el agente puede decidir esperar o relajar la memoria
        break;
    }

    // 2. Inteligencia de exploración: Priorizar casillas NO visitadas si existen
    const noVisitados = movimientosValidos.filter(d => {
        const clave = `${this.x + d.dx},${this.y + d.dy}`;
        return !this.visitados.has(clave);
    });

    // Si hay caminos nuevos los prefiere; si ya exploró todo, se mueve entre los válidos
    const opcionesDisponibles = noVisitados.length > 0 ? noVisitados : movimientosValidos;
    const d = opcionesDisponibles[Math.floor(Math.random() * opcionesDisponibles.length)];

    const nuevoX = this.x + d.dx;
    const nuevoY = this.y + d.dy;
    const claveDestino = `${nuevoX},${nuevoY}`;

    // 3. Simulación de detección de obstáculo en tiempo real (ajustar según tu lógica de mapa)
    // Supongamos que tu mapa tiene una forma de validar si hay un muro u obstáculo en (nuevoX, nuevoY):
    const hayObstaculoRealEnMapa = mapa.obtenerCelda && mapa.obtenerCelda(nuevoX, nuevoY) === 'OBSTACULO'; // (Ejemplo)

    if (hayObstaculoRealEnMapa) {
        // El agente descubre un obstáculo y lo guarda en su memoria para siempre
        this.obstaculos.add(claveDestino);
    } else {
        // Movimiento exitoso: actualiza posición, gasta energía y anota en su historial
        this.x = nuevoX;
        this.y = nuevoY;
        this.energia -= 1;
        this.visitados.add(claveDestino);
    }
    break;
        }
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