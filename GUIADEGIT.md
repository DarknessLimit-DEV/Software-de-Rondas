# 🚀 Guía Rápida de Git y GitHub

Esta guía contiene los comandos esenciales que necesitas para trabajar con tu proyecto de forma segura, organizar tu código con ramas y respaldarlo en GitHub.

---

## 📁 Flujo Diario de Trabajo (El ciclo básico)

Cada vez que hagas cambios en tu código y quieras guardarlos y subirlos, sigue estos 3 pasos en orden:

### 1. Preparar los archivos
Selecciona los archivos modificados que quieres guardar. El punto `.` indica "todos los archivos".
```bash
git add .
```

### 2. Confirmar los cambios (Commit)
Crea una foto de tu código en ese instante con un mensaje descriptivo de lo que hiciste.
```bash
git commit -m "Explicación breve de lo que cambiaste o agregaste"
```

### 3. Subir los cambios a GitHub (Push)
Envía tus commits locales al servidor de GitHub.
```bash
git push
```

---

## 🌿 Trabajo con Ramas (Desarrollo seguro)

Las ramas te permiten crear un espacio seguro para hacer pruebas sin romper el código que ya funciona en la rama principal (`main`).

### Crear y cambiar a una nueva rama
Crea una rama nueva para trabajar en una funcionalidad o corrección específica.
```bash
git checkout -b nombre-de-la-rama
```
*(Ejemplo: `git checkout -b funcion-alertas`)*

### Listar las ramas existentes
Muestra todas las ramas locales. La rama con un asterisco `*` es en la que estás actualmente.
```bash
git branch
```

### Cambiar entre ramas existentes
Si quieres volver a la rama principal (`main`) o a cualquier otra rama que ya creaste:
```bash
git checkout nombre-de-la-rama
```

### Borrar una rama que ya no necesitas
Si una rama de prueba salió mal o ya terminaste con ella y la fusionaste:
```bash
git branch -d nombre-de-la-rama
```
*(Si da error y quieres forzar el borrado de todas formas, usa `-D` en mayúscula: `git branch -D nombre-de-la-rama`)*


---

## 🔀 Fusión de Ramas (Merge) y Limpieza

Cuando terminas de trabajar en una rama de desarrollo (como `arregloTimeStamps`) y quieres integrar sus cambios de forma definitiva a la rama principal (`main`), sigue este proceso:

### 1. Asegurar que los cambios están confirmados
Antes de moverte, asegúrate de haber guardado tus últimos cambios en la rama de desarrollo:
```bash
git add .
git commit -m "Mensaje descriptivo"
```

### 2. Cambiar a la rama principal
Cámbiate a la rama `main`:
```bash
git checkout main
```

### 3. Fusionar la rama de desarrollo
Trae e integra los cambios de tu rama de desarrollo en `main`:
```bash
git merge nombre-de-la-rama
```
*(Ejemplo: `git merge arregloTimeStamps`)*

### 4. Subir la rama principal actualizada a GitHub
Envía la fusión recién realizada en tu computadora al servidor remoto:
```bash
git push origin main
```

### 5. Borrar la rama que ya no necesitas
Para mantener limpio tu proyecto, elimina la rama de desarrollo:
- **Borrar localmente**:
  ```bash
  git branch -d nombre-de-la-rama
  ```
- **Borrar en GitHub (remoto)**:
  ```bash
  git push origin --delete nombre-de-la-rama
  ```

---

## 📡 Sincronización con GitHub (Remoto)

### Descargar cambios desde GitHub (Pull)
Si cambiaste archivos desde la web de GitHub o trabajas con alguien más, trae los cambios más recientes a tu computadora:
```bash
git pull
```

### Subir una nueva rama por primera vez
La primera vez que creas una rama localmente, GitHub no sabe que existe. Debes subirla y enlazarla así:
```bash
git push -u origin nombre-de-la-rama
```

---

## 🔍 Comandos de Utilidad

| Comando | Descripción |
| :--- | :--- |
| `git status` | Muestra el estado actual (en qué rama estás y qué archivos han cambiado sin guardar). |
| `git log --oneline` | Muestra el historial de confirmaciones (commits) simplificado en una línea por commit. |
| `git diff` | Muestra línea por línea los cambios exactos que has hecho y no has guardado aún. |
| `git checkout -- .` | **¡Cuidado!** Deshace todos los cambios locales que no hayas guardado en un commit, volviendo al último estado guardado. |
