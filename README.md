# San Jacinto Vive

Museo virtual público para descubrir la Guerra Nacional de Nicaragua y la Batalla de San Jacinto. El visitante puede recorrer la cronología, seguir las etapas del combate, conocer a sus protagonistas, contrastar fuentes y resolver un reto de ocho preguntas. No necesita cuenta. El sitio no presenta nombres de integrantes ni contenido de una portada universitaria.

El proyecto incluye una aplicación ASP.NET Core Razor Pages con PostgreSQL y administración real, y una edición pública exportada desde las mismas páginas Razor. La carpeta `docs` permite alojar el museo en GitHub Pages o en cualquier servidor estático.

## Abrir la aplicación completa

Requisitos: Docker con Docker Compose.

1. Copiar `.env.example` como `.env`.
2. Completar `POSTGRES_PASSWORD`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`. La contraseña de administración debe tener al menos doce caracteres, mayúsculas, minúsculas, números y un símbolo. No compartir ni subir `.env`.
3. Ejecutar:

```bash
docker compose up --build -d
```

El museo queda en `http://localhost:8080` y el acceso de gestión en `http://localhost:8080/admin`. El primer arranque aplica las migraciones, carga la colección y crea la cuenta indicada en `.env`. El administrador no aparece en la navegación pública y no existe registro abierto de usuarios.

Para consultar el estado de la base de datos y del servidor, abrir `/health`. Para detener los contenedores conservando los datos, ejecutar `docker compose down`.

Las credenciales de creación inicial solo se usan si la cuenta no existe. Cambiar una contraseña en `.env` no cambia una cuenta ya creada. La aplicación persiste las claves de sesión y las imágenes en el volumen `archivos`, y PostgreSQL en el volumen `datos`.

## Qué puede hacer el administrador

El panel permite crear, editar y eliminar acontecimientos, protagonistas y fuentes. En cada acontecimiento se seleccionan sus personajes y fuentes; en cada biografía se seleccionan sus fuentes. Una fuente vinculada no puede eliminarse hasta retirar sus relaciones. Se rechazan identificadores duplicados y referencias a registros inexistentes.

La sección de imágenes admite JPG, PNG y WebP de hasta 5 MB, comprueba su firma, asigna un nombre aleatorio y exige descripción y crédito. Cada imagen se vincula a un evento o personaje. Al eliminarla también se borra su archivo. Las modificaciones del servidor se reflejan inmediatamente en sus páginas y búsquedas.

## Museo público y GitHub Pages

`docs` contiene 39 páginas públicas, sus imágenes y tipografías locales, y el catálogo para búsqueda. El recorrido de la batalla, los filtros, las referencias, la lectura en voz disponible en el navegador y el reto funcionan en el cliente. El mejor resultado del reto se guarda únicamente en el dispositivo del visitante.

GitHub Pages no ejecuta .NET ni PostgreSQL. Su edición pública es de lectura y no incluye rutas de administración. El CRUD y los archivos subidos pertenecen a la aplicación con Docker. Los cambios posteriores en la base de datos no se sincronizan por sí solos con la edición estática.

Para activar GitHub Pages, elegir **Settings → Pages → Source → GitHub Actions** en el repositorio y ejecutar el flujo **Publicar museo en GitHub Pages**. También se publica cuando `docs` cambia en `main`. Los enlaces exportados admiten el prefijo del repositorio.

Para otros alojamientos estáticos, ejecutar `npm run build` o `node scripts/PrepararPublicacion.mjs` y publicar la carpeta `dist`. No requiere instalar paquetes de Node.

Para regenerar la colección inicial pública desde Razor con el SDK .NET 10:

```bash
bash scripts/ExportarMuseo.sh
```

En PowerShell:

```powershell
./scripts/ExportarMuseo.ps1
```

El exportador usa una base SQLite temporal aislada con la colección inicial. No lee ni modifica la base de producción. Para publicar contenido incorporado mediante administración, primero debe existir un proceso de exportación de esa base; este comando no sustituye ese proceso.

## Arquitectura

| Componente | Implementación |
| --- | --- |
| Web pública y administración | ASP.NET Core Razor Pages, .NET 10 LTS |
| Persistencia | Entity Framework Core 10, Npgsql, PostgreSQL 17 |
| Acceso | ASP.NET Core Identity y rol Administrador |
| Interfaz | HTML semántico, CSS propio, JavaScript sin dependencias externas |
| Despliegue del servidor | Dockerfile de dos etapas y Docker Compose |
| Publicación de lectura | Exportación de Razor y GitHub Pages |
| Verificación | xUnit, WebApplicationFactory y servicio PostgreSQL en CI |

Los modelos `EventoPersonaje`, `EventoFuente` y `PersonajeFuente` conservan las relaciones del archivo. La búsqueda usa un índice de texto normalizado para tolerar mayúsculas y tildes. `Multimedia` tiene una restricción que permite un único destino por imagen. Las migraciones están en `src/SanJacintoVive.Web/Data/Migrations`.

## Estructura

```text
.github/workflows/       Compilación, pruebas y publicación
src/SanJacintoVive.Web/
  Data/                  Contexto, migraciones e inicialización
  Models/                Entidades y relaciones
  Pages/                 Museo y panel protegido
  Services/              Archivos y normalización
  wwwroot/               CSS, JavaScript, imágenes y tipografías
tests/SanJacintoVive.Tests/
scripts/                 Exportación pública en Bash y PowerShell
docs/                    Museo de lectura listo para alojar
Dockerfile
docker-compose.yml
SanJacintoVive.sln
```

## Pruebas

```bash
dotnet test tests/SanJacintoVive.Tests/SanJacintoVive.Tests.csproj
```

Sin `TEST_DATABASE`, las pruebas usan SQLite temporal. Si se define una conexión PostgreSQL en `TEST_DATABASE`, el conjunto de integración aplica las migraciones de Npgsql y prueba contra esa base. Debe ser una base vacía destinada exclusivamente a pruebas. El flujo `ci.yml` proporciona un servicio PostgreSQL aislado y también construye la imagen Docker.

Se prueban las páginas públicas, inexistentes, fuentes vinculadas, cronología, búsqueda con tildes, acceso protegido, antifalsificación, credenciales inválidas, redirección local, cierre de sesión, CRUD con relaciones, rechazo de archivos falsos, subida y eliminación de imágenes e inicialización idempotente.

## Fuentes y decisiones históricas

La colección inicial contiene 11 acontecimientos, 9 protagonistas y 11 fuentes. Reúne recursos del MINED, Jerónimo Pérez, William Walker, Frances Kinloch Tijerino, Alejandro Bolaños Geyer, Jorge Eduardo Arellano, la Asamblea Nacional y el Ministerio de Defensa. Cada acontecimiento y biografía enlaza sus fuentes; la biblioteca muestra referencias y notas de lectura crítica.

Se distingue el 15 de septiembre de 1821 del 14 de septiembre de 1856. El decreto esclavista se sitúa el 22 de septiembre, después de la batalla. Las cifras tradicionales sobre las fuerzas se presentan sin sumar versiones incompatibles. La ficha de Fonseca hace visible la variación documental del nombre.

La entrada de la guerra civil se sitúa el 1 de mayo de 1854 solo para ordenar el proceso de ese mes, tal como aclara su texto. El mapa del combate es un esquema didáctico sin escala, y la casa hacienda es una interpretación gráfica. La cartografía de James Wyld y el retrato histórico de Estrada conservan créditos en la biblioteca y en `wwwroot/images/creditos.json`. Las licencias de las tipografías se incluyen con los archivos.

## Operación del servidor

Para un despliegue público de la aplicación con administración, colocar los contenedores detrás de un proxy HTTPS y restringir el acceso a los archivos de configuración y volúmenes. PostgreSQL no expone un puerto al host en Compose. Los formularios de escritura usan protección antifalsificación; el panel requiere el rol Administrador. Identity aplica hashing, bloqueo por intentos y una sesión de 45 minutos. Las páginas reciben una política CSP, protección contra detección incorrecta de MIME y una política de referencias.

Respaldo de PostgreSQL:

```bash
docker compose exec -T db pg_dump -U sanjacinto -d sanjacinto > respaldo.sql
```

Respaldar también el volumen `archivos`; contiene las imágenes y las claves de protección de sesión. Proteger los respaldos con las mismas medidas que los datos de producción.

Para crear una migración después de modificar los modelos, instalar `dotnet-ef` 10 y ejecutar:

```bash
dotnet ef migrations add NombreDelCambio --project src/SanJacintoVive.Web
```

Al iniciar el servidor se aplican las migraciones pendientes. Revisarlas y respaldar la base antes de desplegar cambios de esquema. La colección inicial se carga una sola vez mediante un marcador persistente y no sobrescribe las ediciones del administrador.
