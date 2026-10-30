using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SanJacintoVive.Web.Data;
using SanJacintoVive.Web.Models;
using SanJacintoVive.Web.Services;
namespace SanJacintoVive.Web.Pages.Admin;
public class IndexModel(ApplicationDbContext db, ArchivoService archivos) : PageModel
{
    public List<Evento> Eventos { get; private set; } = [];
    public List<Personaje> Personajes { get; private set; } = [];
    public List<Fuente> Fuentes { get; private set; } = [];
    public List<Multimedia> Imagenes { get; private set; } = [];
    [TempData] public string? Mensaje { get; set; }
    public async Task OnGetAsync() {
        Eventos = await db.Eventos.AsNoTracking().OrderBy(x=>x.Fecha).ToListAsync();
        Personajes = await db.Personajes.AsNoTracking().OrderBy(x=>x.Id).ToListAsync();
        Fuentes = await db.Fuentes.AsNoTracking().OrderBy(x=>x.Id).ToListAsync();
        Imagenes = await db.Multimedia.AsNoTracking().ToListAsync();
    }
    public async Task<IActionResult> OnPostEliminarAsync(string tipo, int id)
    {
        var rutas = new List<string>();
        switch(tipo) {
            case "evento":
                var evento = await db.Eventos.Include(x=>x.Imagenes).SingleOrDefaultAsync(x=>x.Id==id);
                if(evento is null) return NotFound();
                rutas.AddRange(evento.Imagenes.Select(x=>x.Ruta)); db.Eventos.Remove(evento); break;
            case "personaje":
                var personaje = await db.Personajes.Include(x=>x.Imagenes).SingleOrDefaultAsync(x=>x.Id==id);
                if(personaje is null) return NotFound();
                rutas.AddRange(personaje.Imagenes.Select(x=>x.Ruta)); db.Personajes.Remove(personaje); break;
            case "fuente":
                var fuente = await db.Fuentes.SingleOrDefaultAsync(x=>x.Id==id);
                if(fuente is null) return NotFound();
                if(await db.EventoFuentes.AnyAsync(x=>x.FuenteId==id) || await db.PersonajeFuentes.AnyAsync(x=>x.FuenteId==id)) {
                    Mensaje="La fuente está vinculada a contenido. Retirá sus vínculos antes de eliminarla.";
                    return RedirectToPage();
                }
                db.Fuentes.Remove(fuente); break;
            case "imagen":
                var imagen=await db.Multimedia.SingleOrDefaultAsync(x=>x.Id==id);
                if(imagen is null) return NotFound();
                rutas.Add(imagen.Ruta); db.Multimedia.Remove(imagen); break;
            default: return BadRequest();
        }
        await db.SaveChangesAsync();
        foreach(var ruta in rutas) archivos.Eliminar(ruta);
        Mensaje="El registro se eliminó correctamente."; return RedirectToPage();
    }
}
