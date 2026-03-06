# Actualización diaria del monitor

## 1. Descarga el CSV

```bash
node download.mjs
```

Esto hace login en ACLED automáticamente y guarda el CSV en `~/Downloads/acled_latest.csv`.

---

## 2. Abre la terminal y ve al proyecto

```bash
cd "/Users/miguel.ros/Desktop/PANELES/Guerra Irán/viz"
```

---

## 3. Traduce los eventos nuevos

```bash
node translate.mjs
```

El script detecta automáticamente los eventos nuevos y traduce solo esos.
Verás algo así:

```
Eventos ya traducidos: 815
Eventos nuevos a traducir: 23
Traduciendo 1–23 de 23… ✓
Guardado en src/data/events.csv (838 eventos)
```

---

## 4. Publica

```bash
npm run deploy
```

En un par de minutos GitHub Pages sirve la versión actualizada.

---

## Notas

- Las traducciones usan la API gratuita de DeepL (500.000 caracteres/mes).
- El plan gratuito es más que suficiente para las actualizaciones diarias.
- Si algún día el nombre del CSV descargado cambia, edita esta línea en `translate.mjs`:
  ```js
  const INPUT_FILE = '/Users/miguel.ros/Downloads/NOMBRE_DEL_ARCHIVO.csv';
  ```
