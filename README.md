# Carrera de Crack ⚽

Juego de fútbol web con **modo carrera**: creá tu jugador "cabezón", debutá a los 17 y llevalo a la gloria hasta el retiro. Todo es inventado: tres ligas (🇮🇹 Lega Stivale, 🇪🇸 Liga Siesta, 🇬🇧 Premier Pudding), sus copas y la Copa de Naciones.

- **Jugá o simulá** cada partido. Si jugás, salís a la cancha y controlás a tu jugador en las jugadas clave: mano a mano, contraataque, pared, desborde, remate de afuera, **tiros libres con barrera**, **penales**, el épico minuto 90 y el **penal decisivo** de los mata-mata.
- **Mira** para apuntar, **vaselina**, **tiro con comba**, barridas avisadas que podés saltar, **repetición del gol** en cámara lenta, festejos, clima (lluvia, noche) y bengalas.
- **El DT decide** si sos titular según tu nivel, tu relación con él y tu rival por el puesto.
- **Más de 25 eventos** con cadenas (romances, peleas con el capitán, apuestas, promesas de gol), cláusulas de rescisión y hitos de carrera.
- **Mercado de pases** entre las tres ligas, con negociación por rondas.
- **Tienda** (botines, festejos, vinchas y estilo de vida con efectos), **plan de entrenamiento**, convocatoria a la **selección**.
- **Diario** con noticias de tu carrera y del mundo, y tablas de todas las ligas.
- 3 ranuras de guardado, exportar/importar la partida y **Salón de la Fama**.

Todo se dibuja y suena por código (sin imágenes ni audios), funciona sin internet y se instala en el celular.

## Controles

| Teclado | Acción |
|---|---|
| WASD / flechas | Mover |
| Shift | Correr |
| Espacio (mantener) | Patear con potencia |
| E | Pase / pedirla de vuelta |
| Toque corto de Espacio | Vaselina |
| Shift + Espacio | Tiro colocado con comba |
| Q | Amague / saltar una barrida |

En el celular: joystick a la izquierda y botones a la derecha (mejor en horizontal).

## Desarrollo

```bash
npm install
npm run dev     # servidor local
npm run build   # genera dist/
npm run sim     # simula 30 carreras completas para revisar el balance

# probar una jugada puntual: Opciones → Entrenamiento con ?jugada=libre (o penal, mano, contra, pared, afuera, banda) en la URL
```

Clubes, liga, jugadores y marcas son inventados.
