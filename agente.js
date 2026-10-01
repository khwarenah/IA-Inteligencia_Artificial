// agente.js
import { TIPO_CASILLA } from './mapa.js';
import { encontrarRutaAEstrella } from './astar.js';

const PALETA = {
    '.': null, 'K': '#121212', 'G': '#8cd838', 'g': '#b4f05c',
    'S': '#fbe2c3', 'E': '#cca028', 'M': '#b88168', 'W': '#ffffff', 'D': '#3b3154'
};

const SPRITES_CC = {
    'ABAJO': [
        ".....KKKKKK.....","...KKGGGGGGKK...","..KGGgGGGGgGGK..","..KGGGGGGGGGGK..",
        "..KGGSSSSSSGGK..","..KGGSEESEEGGK..","..KGGSKMMKSGGK..","..KGGSSSSSSGGK..",
        ".KKGGSKKKKSGGKK.",".KGGGWWWWWWGGGK.",".KGGGWWDDWWGGGK.",".KGGGWWDDWWGGGK.",
        "..KGGWWWWWWGGK..","...KKWWDDWWKK...","....KWW..WWK....","....KWW..WWK....",
        "....KDD..DDK....","....KKK..KKK...."
    ],
    'ARRIBA': [
        ".....KKKKKK.....","...KKGGGGGGKK...","..KGGgGGGGgGGK..","..KGGGGGGGGGGK..",
        "..KGGGGGGGGGGK..","..KGGGGGGGGGGK..","..KGGGGGGGGGGK..","..KGGGGGGGGGGK..",
        ".KKGGGGGGGGGGKK.",".KGGGWWWWWWGGGK.",".KGGGWWDDWWGGGK.",".KGGGWWDDWWGGGK.",
        "..KGGWWWWWWGGK..","...KKWWDDWWKK...","....KWW..WWK....","....KWW..WWK....",
        "....KDD..DDK....","....KKK..KKK...."
    ],
    'IZQUIERDA': [
        ".....KKKKKK.....","...KKGGGGGGKK...","..KGGgGGGGgGGK..","..KGGGGGGGGGGK..",
        "..KGGSSSSSSGGK..","..KGGEESSSSGGK..","..KGGMMKSSSGGK..","..KGGSSSSSSGGK..",
        ".KKGGSKKKKSGGKK.",".KGGGWWWWWWGGGK.",".KGGGWWDDWWGGGK.",".KGGGWWDDWWGGGK.",
        "..KGGWWWWWWGGK..","...KKWWDDWWKK...","....KWW..WWK....","....KWW..WWK....",
        "....KDD..DDK....","....KKK..KKK...."
    ],
    'DERECHA': [
        ".....KKKKKK.....","...KKGGGGGGKK...","..KGGgGGGGgGGK..","..KGGGGGGGGGGK..",
        "..KGGSSSSSSGGK..","..KGGSSSSSSGGK..","..KGGSSSSEESGGK.","..KGGSSSKMMKGGK.",
        "..KGGSSSSSSGGK..",".KKGGSKKKKSGGKK.",".KKGGSKKKKSGGKK.",".KGGGWWWWWWGGGK.",
        ".KGGGWWDDWWGGGK.",".KGGGWWDDWWGGGK.","..KGGWWWWWWGGK..","...KKWWDDWWKK...",
        "....KWW..WWK....","....KWW..WWK....","....KDD..DDK....","....KKK..KKK...."
    ]
};

export class AgenteCC {
    constructor(x, y, tamanoCasilla = 40) {
        this.x = x;
        this.y = y;
        this.tamanoCasilla = tamanoCasilla;

        this.energia = 100;
        this.tasaRecarga = 20;
        this.tieneFragmento = false;
        this.fragmentosRecolectados = 0;
        this.salud = 100;
        this.vidasPerdidas = 0;

        this.estaMuerta = false;
        this.turnosMensajeFuego = 0;
        this.cayendoHielo = 0;

        this.estado = "Dormida";
        this.direccion = "ABAJO";

        this.memoriaBase = { x: x, y: y };
        this.posAnterior = { x: x, y: y };
        this.mapaMental = {};
        this.obstaculosBloqueantes = [];

        // --- PLAN DE RUTA ACTUAL (A*) ---
        this.rutaPlanificada = [];       // pasos pendientes de la ruta A* actual
        this.objetivoPlanificado = null; // hacia dónde apunta esa ruta
        this.objetivoCristalFijo = null; // cristal "bloqueado": no cambia solo porque otro esté un poco más cerca

        // --- ZONAS DE PELIGRO "VIVAS" (dragón/brujo, según su posición actual) ---
        this.celdasPeligroVivo = new Set();

        this.sentidosActuales = {
            vista: "Inactivo", oido: "Inactivo", olfato: "Inactivo",
            tacto: "Inactivo", gusto: "Inactivo"
        };
    }

    registrarObstaculosBloqueantes(lista) {
        this.obstaculosBloqueantes = lista;
    }

    estaBloqueado(x, y) {
        return this.obstaculosBloqueantes.some(o => o.x === x && o.y === y);
    }

    actualizarDireccion(dx, dy) {
        const MAPA_DIRECCIONES = { '0,-1': 'ARRIBA', '0,1': 'ABAJO', '-1,0': 'IZQUIERDA', '1,0': 'DERECHA' };
        const nuevaDir = MAPA_DIRECCIONES[`${dx},${dy}`];
        if (nuevaDir) this.direccion = nuevaDir;
    }

    recibirDpsFuego(puntos, origenX, origenY, radioPeligro = 1) {
        if (this.estaMuerta) return;
        this.salud = Math.max(0, this.salud - puntos);
        this.turnosMensajeFuego = 3;
        if (origenX !== undefined && origenY !== undefined) this.registrarZonaPeligro(origenX, origenY, radioPeligro);
        if (this.salud <= 0) this.iniciarRespawnLento();
        else this.estado = `¡C.C esta recibiendo daño por fuego! Salud: ${this.salud}%`;
    }

    recibirDano(puntos, origenX, origenY, radioPeligro = 1) {
        this.recibirDpsFuego(puntos, origenX, origenY, radioPeligro);
    }

    iniciarRespawnLento() {
        this.estaMuerta = true;
        this.salud = 0;
        this.estado = "¡C.C. ha sido incinerada por el fuego del Dragon! Reapareciendo en 10 segundos...";
        setTimeout(() => { this.reaparecer(); this.estaMuerta = false; }, 10000);
    }

    ahogarseEnHielo() {
        if (this.estaMuerta) return;
        this.estaMuerta = true;
        this.salud = 0;
        this.cayendoHielo = 8;
        this.estado = "❄️💧 ¡El hielo se rompió bajo los pies de C.C.! Cayó al agua helada... Reapareciendo en 10 segundos...";
        setTimeout(() => { this.reaparecer(); this.estaMuerta = false; }, 10000);
    }

    reaparecer() {
        this.vidasPerdidas++;
        this.x = this.memoriaBase.x;
        this.y = this.memoriaBase.y;
        this.salud = 100;
        this.energia = 100;
        this.tieneFragmento = false;
        this.posAnterior = { x: this.x, y: this.y };

        // Si murió a mitad de una ruta, esos pasos pendientes fueron
        // calculados desde donde murió, no desde la base. Sin esto, el
        // siguiente turno seguiría esa ruta vieja y "jalaría" a C.C. de
        // regreso hacia donde cayó, en vez de empezar de cero desde el altar.
        this.rutaPlanificada = [];
        this.objetivoPlanificado = null;
        this.objetivoCristalFijo = null;

        this.estado = `C.C Murio. Reapareciendo en el Altar (Caídas: ${this.vidasPerdidas})`;
    }

    registrarZonaPeligro(centerX, centerY, radio = 2) {
        for (let dy = -radio; dy <= radio; dy++) {
            for (let dx = -radio; dx <= radio; dx++) {
                const clave = `${centerX + dx},${centerY + dy}`;
                if (!this.mapaMental[clave]) {
                    this.mapaMental[clave] = { revelado: true, visitas: 0, costo: 0.5, tieneCristal: false, esZonaFuego: true };
                } else {
                    this.mapaMental[clave].esZonaFuego = true;
                }
            }
        }
    }

    percibirVista(mapa, dragon) {
        const observacion = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = this.x + dx, ny = this.y + dy;
                if (nx >= 0 && nx < mapa.columnas && ny >= 0 && ny < mapa.filas) {
                    const detectaDragon = dragon?.ocupaCasilla?.(nx, ny) || false;
                    observacion.push({ x: nx, y: ny, contenido: mapa.grid[ny][nx], hayDragon: detectaDragon });
                    if (detectaDragon) this.registrarZonaPeligro(nx, ny, 1);
                }
            }
        }
        return observacion;
    }

    /**
     * Actualiza this.celdasPeligroVivo con un radio de 1 casilla alrededor de
     * dónde esté AHORA MISMO el dragón y el brujo, sin importar si están
     * dentro del campo de visión de 3x3. Se recalcula entero cada turno.
     */
    actualizarZonasPeligroVivas(dragon, brujo) {
        this.celdasPeligroVivo.clear();

        const marcarAlrededor = (entidad, radio = 1) => {
            if (!entidad || entidad.estaMuerto || entidad.estaMuerta) return;
            const celdas = (typeof entidad.obtenerCasillasOcupadas === 'function')
                ? entidad.obtenerCasillasOcupadas()
                : [{ x: entidad.x, y: entidad.y }];

            for (const celda of celdas) {
                for (let dy = -radio; dy <= radio; dy++) {
                    for (let dx = -radio; dx <= radio; dx++) {
                        this.celdasPeligroVivo.add(`${celda.x + dx},${celda.y + dy}`);
                    }
                }
            }
        };

        marcarAlrededor(dragon, 1);
        marcarAlrededor(brujo, 1);
    }

    percibirOido(mapa) {
        const baseX = mapa?.baseX ?? this.memoriaBase.x;
        const baseY = mapa?.baseY ?? this.memoriaBase.y;
        const d = Math.abs(this.x - baseX) + Math.abs(this.y - baseY);
        const nivel = (d <= 2 && 'FUERTE') || (d <= 5 && 'MEDIO') || 'DEBIL';
        return { nivel, distancia: d, descripcion: `Resonancia ${nivel} (${d} casillas del Altar)` };
    }

    percibirOlfato(mapa) {
        const grid = mapa?.grid || [];
        const fragmentos = [];
        grid.forEach((row, r) => row.forEach((val, c) => { if (val === TIPO_CASILLA.FRAGMENTO) fragmentos.push({ x: c, y: r }); }));
        const sinFragmentos = fragmentos.length === 0;
        const distancias = fragmentos.map(f => Math.abs(this.x - f.x) + Math.abs(this.y - f.y));
        const menorDistancia = sinFragmentos ? Infinity : Math.min(...distancias);
        const intensidad = sinFragmentos ? 0 : Number((1 / (menorDistancia + 1)).toFixed(2));
        return {
            intensidad, distancia: menorDistancia,
            objetivo: sinFragmentos ? null : fragmentos[distancias.indexOf(menorDistancia)],
            descripcion: sinFragmentos ? 'Sin fragmentos en el mapa' : `Intensidad ${intensidad} (Cristal a ${menorDistancia} cas)`
        };
    }

    percibirTacto(mapa) {
        const casillaActual = mapa.grid[this.y][this.x];
        let costoTerreno = 0.5, tipoNombre = "Normal";
        if (casillaActual === TIPO_CASILLA.NIEVE) { costoTerreno = 4; tipoNombre = "Nieve (Alta resistencia)"; }
        else if (casillaActual === TIPO_CASILLA.HIELO) { costoTerreno = 2; tipoNombre = "Hielo (Resistencia media)"; }
        return {
            casillaActual, costoMovimiento: costoTerreno, tipoNombre,
            puedoMovermeA: (nx, ny) => (nx >= 0 && nx < mapa.columnas && ny >= 0 && ny < mapa.filas)
        };
    }

    percibirGusto(mapa) {
        const enBase = (this.x === mapa.baseX) && (this.y === mapa.baseY);
        const eficiencia = enBase ? 1.0 : 0.0;
        const recargaPosible = Math.min(100 - this.energia, this.tasaRecarga * eficiencia);
        return {
            enBase, eficiencia, energiaARecargar: recargaPosible,
            descripcion: enBase ? `Sabor místico: Absorbiendo energía (+${recargaPosible})` : 'Sabor insípido: Fuera del Altar'
        };
    }

    percibir(mapa, dragon, brujo) {
        if (this.estaMuerta) return null;

        this.actualizarZonasPeligroVivas(dragon, brujo);

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
        this.sentidosActuales = {
            vista: `Escaneando cuadrante 3x3 (${percepcion.vista.length} casillas observadas)`,
            oido: percepcion.oido.descripcion,
            olfato: percepcion.olfato.descripcion,
            tacto: `Terreno: ${percepcion.tacto.tipoNombre} - Costo: ${percepcion.tacto.costoMovimiento}`,
            gusto: percepcion.gusto.descripcion
        };
        this.actualizarMemoria(percepcion, mapa);
        return percepcion;
    }

    actualizarMemoria(percepcion, mapa) {
        if (mapa?.baseX !== undefined && mapa?.baseY !== undefined) {
            this.memoriaBase = { x: mapa.baseX, y: mapa.baseY };
        } else if (percepcion.enBase) {
            this.memoriaBase = { x: this.x, y: this.y };
        }
        percepcion.vista.forEach(casilla => {
            const clave = `${casilla.x},${casilla.y}`;
            let costo = 0.5;
            if (casilla.contenido === TIPO_CASILLA.NIEVE) costo = 4;
            else if (casilla.contenido === TIPO_CASILLA.HIELO) costo = 2;
            if (!this.mapaMental[clave]) {
                this.mapaMental[clave] = {
                    revelado: true, visitas: 0, costo,
                    tieneCristal: casilla.contenido === TIPO_CASILLA.FRAGMENTO,
                    esZonaFuego: casilla.hayDragon || false
                };
            } else {
                this.mapaMental[clave].tieneCristal = (casilla.contenido === TIPO_CASILLA.FRAGMENTO);
                if (casilla.hayDragon) this.mapaMental[clave].esZonaFuego = true;
            }
        });
        const claveActual = `${this.x},${this.y}`;
        if (this.mapaMental[claveActual]) this.mapaMental[claveActual].visitas += 1;
    }

    reglaReflejo(percepcion) {
        if (this.estaMuerta) return 'ESPERANDO_RESPAWN';
        if (this.energia <= 0) return 'SIN_ENERGIA';
        if (percepcion.hayFragmento && !this.tieneFragmento) return 'RECOGER_FRAGMENTO';
        if (percepcion.enBase && this.tieneFragmento) return 'DEPOSITAR_FRAGMENTO';
        if (percepcion.enBase && percepcion.energiaIncompleta) return 'RECARGAR';
        if ((this.energia <= 40 || this.tieneFragmento) && !percepcion.enBase) return 'REGRESAR_A_BASE';
        return 'EXPLORAR_INTELIGENTE';
    }

    evaluarMovimiento(nx, ny, objetivo, modoAccion) {
        const clave = `${nx},${ny}`;
        const infoMemoria = this.mapaMental[clave];
        let pesoTerreno = infoMemoria?.costo || 0.5;
        let pesoZonaFuego = infoMemoria?.esZonaFuego ? 40 : 0;
        const esRegresoInmediato = (nx === this.posAnterior.x && ny === this.posAnterior.y);
        let pesoHistorial = esRegresoInmediato ? 15 : 0;
        let distObjetivo = objetivo ? Math.abs(nx - objetivo.x) + Math.abs(ny - objetivo.y) : 0;

        if (modoAccion === 'REGRESAR_A_BASE') {
            return pesoTerreno + pesoHistorial + pesoZonaFuego + (distObjetivo * 30);
        }
        const numVisitas = infoMemoria?.visitas || 0;
        let pesoRepeticion = numVisitas * 12;
        let bonoInexplorado = (!infoMemoria || !infoMemoria.revelado) ? -8 : 0;
        return pesoTerreno + pesoHistorial + pesoZonaFuego + pesoRepeticion + bonoInexplorado + (distObjetivo * 2);
    }

    /**
     * Costo de ENTRAR a (nx, ny) para A*: respeta los obstáculos bloqueantes
     * (árboles, castillo — devuelve Infinity, A* lo trata como un muro),
     * más el costo de terreno recordado y el peligro (permanente y vivo).
     */
    costoParaAEstrella(nx, ny) {
        if (this.estaBloqueado(nx, ny)) return Infinity; // árbol/castillo: intransitable

        const clave = `${nx},${ny}`;
        const infoMemoria = this.mapaMental[clave];

        const costoTerreno = infoMemoria?.costo ?? 0.5;
        const peligroPermanente = infoMemoria?.esZonaFuego ? 40 : 0;
        const peligroVivo = this.celdasPeligroVivo.has(clave) ? 40 : 0;

        return costoTerreno + Math.max(peligroPermanente, peligroVivo);
    }

    /** Planifica con A* la ruta completa desde la posición actual hasta "objetivo". */
    planificarRutaAEstrella(mapa, objetivo) {
        return encontrarRutaAEstrella(
            mapa,
            { x: this.x, y: this.y },
            objetivo,
            (nx, ny) => this.costoParaAEstrella(nx, ny),
            0.5
        );
    }

    seleccionarMejorPaso(mapa, objetivo, modoAccion) {
        const direcciones = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
        let mejorOpcion = null, menorPuntaje = Infinity;
        for (const dir of direcciones) {
            const nx = this.x + dir.dx, ny = this.y + dir.dy;
            if (nx >= 0 && nx < mapa.columnas && ny >= 0 && ny < mapa.filas && !this.estaBloqueado(nx, ny)) {
                const puntaje = this.evaluarMovimiento(nx, ny, objetivo, modoAccion);
                if (puntaje < menorPuntaje) { menorPuntaje = puntaje; mejorOpcion = { nx, ny, dx: dir.dx, dy: dir.dy }; }
            }
        }
        return mejorOpcion;
    }

    actuar(accion, mapa) {
        if (this.estaMuerta) return;
        switch (accion) {
            case 'SIN_ENERGIA':
                this.estado = "la Agente t0 C.C. ha entrado en un letargo eterno.";
                break;
            case 'RECOGER_FRAGMENTO':
                this.tieneFragmento = true;
                mapa.grid[this.y][this.x] = TIPO_CASILLA.VACIA;
                if (this.mapaMental[`${this.x},${this.y}`]) this.mapaMental[`${this.x},${this.y}`].tieneCristal = false;
                this.objetivoCristalFijo = null;
                this.rutaPlanificada = [];
                this.objetivoPlanificado = null;
                this.estado = "C.C. recupero un fragmento de espejo y lo esta devolviendo al altar.";
                break;
            case 'DEPOSITAR_FRAGMENTO':
                this.tieneFragmento = false;
                this.fragmentosRecolectados++;
                break;
            case 'RECARGAR':
                this.energia = Math.min(100, this.energia + this.tasaRecarga);
                this.estado = `Utilizando el sabor de la energía en el altar para recuperar energía (${this.energia}%)`;
                break;
            case 'REGRESAR_A_BASE':
            case 'EXPLORAR_INTELIGENTE': {
                this.posAnterior = { x: this.x, y: this.y };
                let objetivo = null;
                if (accion === 'REGRESAR_A_BASE') {
                    objetivo = this.memoriaBase;
                    const razon = this.tieneFragmento ? "Transportando cristal" : "Energía <= 40%";
                    this.estado = `Usando A* (guiado por el Oído) para volver al Altar (${razon}) | Energía: ${this.energia}%`;
                } else {
                    const fijoSigueValido = this.objetivoCristalFijo
                        && mapa.grid[this.objetivoCristalFijo.y][this.objetivoCristalFijo.x] === TIPO_CASILLA.FRAGMENTO;

                    if (fijoSigueValido) {
                        objetivo = this.objetivoCristalFijo;
                        this.estado = `Usando A* (guiado por el Olfato) hacia el cristal fijado en (${objetivo.x}, ${objetivo.y})`;
                    } else {
                        const olfato = this.percibirOlfato(mapa);
                        if (olfato.objetivo) {
                            objetivo = olfato.objetivo;
                            this.objetivoCristalFijo = olfato.objetivo;
                            this.estado = `Usando A* (guiado por el Olfato) hacia un cristal nuevo (Distancia: ${olfato.distancia})`;
                        } else {
                            this.objetivoCristalFijo = null;
                            this.estado = "Utilizando la Vista para la inspección de casillas no visitadas anteriormente.";
                        }
                    }
                }

                let paso = null;

                if (objetivo) {
                    const objetivoCambio = !this.objetivoPlanificado
                        || this.objetivoPlanificado.x !== objetivo.x
                        || this.objetivoPlanificado.y !== objetivo.y;

                    const siguientePlaneado = this.rutaPlanificada[0];
                    const pasoPlaneadoInvalido = siguientePlaneado
                        && (this.mapaMental[`${siguientePlaneado.x},${siguientePlaneado.y}`]?.esZonaFuego
                            || this.celdasPeligroVivo.has(`${siguientePlaneado.x},${siguientePlaneado.y}`)
                            || this.estaBloqueado(siguientePlaneado.x, siguientePlaneado.y));

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
                    this.rutaPlanificada = [];
                    this.objetivoPlanificado = null;
                    paso = this.seleccionarMejorPaso(mapa, null, accion);
                }

                if (paso) {
                    this.actualizarDireccion(paso.dx, paso.dy);
                    this.x = paso.nx;
                    this.y = paso.ny;
                    const tactoActual = this.percibirTacto(mapa);
                    this.energia = Math.max(0, this.energia - tactoActual.costoMovimiento);
                    if (tactoActual.casillaActual === TIPO_CASILLA.HIELO) {
                        if (Math.random() < 0.10) this.ahogarseEnHielo();
                    }
                }
                break;
            }
        }
        if (this.turnosMensajeFuego > 0) {
            this.turnosMensajeFuego--;
            this.estado = `FUEGO🔥!!!!!!! [EN ZONA DE FUEGO - HP: ${this.salud}%] ` + this.estado;
        }
    }

    dibujar(ctx) {
        if (this.estaMuerta && this.cayendoHielo <= 0) return;
        const posX = this.x * this.tamanoCasilla;
        const posY = this.y * this.tamanoCasilla;

        if (this.cayendoHielo > 0) {
            this._dibujarCaidaHielo(ctx, posX, posY);
            this.cayendoHielo--;
            return;
        }

        if (this.tieneFragmento) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.fillRect(posX, posY, this.tamanoCasilla, this.tamanoCasilla);
        }

        const spriteActual = SPRITES_CC[this.direccion] || SPRITES_CC['ABAJO'];
        const filas = spriteActual.length, cols = spriteActual[0].length, tamPixel = 2;
        const offsetX = posX + (this.tamanoCasilla - (cols * tamPixel)) / 2;
        const offsetY = posY + (this.tamanoCasilla - (filas * tamPixel)) / 2;

        for (let r = 0; r < filas; r++) {
            for (let c = 0; c < cols; c++) {
                const colorHex = PALETA[spriteActual[r][c]];
                if (colorHex) {
                    ctx.fillStyle = colorHex;
                    ctx.fillRect(offsetX + c * tamPixel, offsetY + r * tamPixel, tamPixel, tamPixel);
                }
            }
        }
    }

    _dibujarCaidaHielo(ctx, posX, posY) {
        const cx = posX + this.tamanoCasilla / 2;
        const cy = posY + this.tamanoCasilla / 2;
        const progreso = 1 - (this.cayendoHielo / 8);
        const radio = this.tamanoCasilla * 0.6 * progreso;

        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radio, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        [{ dx: -12, dy: -8 }, { dx: 14, dy: -6 }, { dx: -8, dy: 12 }, { dx: 10, dy: 10 }].forEach(g => {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + g.dx, cy + g.dy);
            ctx.stroke();
        });

        const tamañoHundiendo = 10 * (1 - progreso);
        if (tamañoHundiendo > 0) {
            ctx.fillStyle = '#0c4a6e';
            ctx.beginPath();
            ctx.arc(cx, cy, tamañoHundiendo, 0, Math.PI * 2);
            ctx.fill();
        }

        if (progreso > 0.4) {
            const opacidad = Math.min(1, (progreso - 0.4) / 0.4);
            const flotarY = cy - 18 - (progreso * 6);
            ctx.globalAlpha = opacidad;
            ctx.fillStyle = '#e2e8f0';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, flotarY, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillRect(cx - 4, flotarY + 4, 8, 4);
            ctx.strokeRect(cx - 4, flotarY + 4, 8, 4);
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(cx - 3, flotarY - 1, 1.8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 3, flotarY - 1, 1.8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx, flotarY + 1);
            ctx.lineTo(cx - 1.5, flotarY + 4);
            ctx.lineTo(cx + 1.5, flotarY + 4);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    dibujarCampoVision(ctx, color = 'rgba(56, 189, 248, 0.25)') {
        if (this.estaMuerta) return;
        const tam = this.tamanoCasilla;
        const inicioX = (this.x - 1) * tam, inicioY = (this.y - 1) * tam, dimension = tam * 3;
        ctx.save();
        ctx.fillStyle = color;
        ctx.fillRect(inicioX, inicioY, dimension, dimension);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(inicioX, inicioY, dimension, dimension);
        ctx.restore();
    }
}