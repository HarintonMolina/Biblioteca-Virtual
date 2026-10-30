using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SanJacintoVive.Web.Data;
using SanJacintoVive.Web.Models;
namespace SanJacintoVive.Web.Pages.Admin;
public class EditarEventoModel(ApplicationDbContext db) : PageModel
{
    [BindProperty] public Evento Input { get; set; } = new();
    public List<Fuente> Fuentes { get; private set; } = [];
    [BindProperty, MinLength(1, ErrorMessage="Seleccioná al menos una fuente.")] public int[] FuenteIds { get; set; } = [];
    public List<Personaje> Personajes { get; private set; } = [];
    [BindProperty] public int[] PersonajeIds { get; set; } = [];
    private async Task CargarAsync() { Fuentes = await db.Fuentes.AsNoTracking().OrderBy(x=>x.Id).ToListAsync(); Personajes = await db.Personajes.AsNoTracking().OrderBy(x=>x.Id).ToListAsync(); await Task.CompletedTask; }
    public async Task<IActionResult> OnGetAsync(int? id)
    {
        await CargarAsync();
        if(id.HasValue) {
            var item=await db.Eventos.Include(x=>x.Fuentes).Include(x=>x.Personajes).SingleOrDefaultAsync(x=>x.Id==id);
            if(item is null) return NotFound(); Input=item; FuenteIds=item.Fuentes.Select(x=>x.FuenteId).ToArray();PersonajeIds=item.Personajes.Select(x=>x.PersonajeId).ToArray();
        }
        return Page();
    }
    public async Task<IActionResult> OnPostAsync()
    {
        await CargarAsync();
        if(await db.Fuentes.CountAsync(x=>FuenteIds.Distinct().Contains(x.Id))!=FuenteIds.Distinct().Count()) ModelState.AddModelError("", "Una de las fuentes ya no existe.");
        if(await db.Personajes.CountAsync(x=>PersonajeIds.Distinct().Contains(x.Id))!=PersonajeIds.Distinct().Count()) ModelState.AddModelError("", "Uno de los personajes ya no existe.");
        if(await db.Eventos.AnyAsync(x=>x.Slug==Input.Slug && x.Id!=Input.Id)) ModelState.AddModelError("Input.Slug", "Este identificador ya está en uso.");
        if(!ModelState.IsValid) return Page();
        var entity=Input.Id==0 ? new Evento() : await db.Eventos.Include(x=>x.Fuentes).Include(x=>x.Personajes).SingleOrDefaultAsync(x=>x.Id==Input.Id);
        if(entity is null) return NotFound();
        entity.Titulo=Input.Titulo;
            entity.Slug=Input.Slug;
            entity.Fecha=Input.Fecha;
            entity.Lugar=Input.Lugar;
            entity.Capitulo=Input.Capitulo;
            entity.Resumen=Input.Resumen;
            entity.Descripcion=Input.Descripcion;
        foreach(var link in entity.Fuentes.Where(x=>!FuenteIds.Contains(x.FuenteId)).ToList()) entity.Fuentes.Remove(link);
        foreach(var link in entity.Personajes.Where(x=>!PersonajeIds.Contains(x.PersonajeId)).ToList()) entity.Personajes.Remove(link);
        foreach(var id in FuenteIds.Distinct().Where(id=>!entity.Fuentes.Any(x=>x.FuenteId==id))) entity.Fuentes.Add(new EventoFuente { FuenteId=id });
        foreach(var id in PersonajeIds.Distinct().Where(id=>!entity.Personajes.Any(x=>x.PersonajeId==id))) entity.Personajes.Add(new EventoPersonaje { PersonajeId=id });
        if(Input.Id==0) db.Eventos.Add(entity);
        await db.SaveChangesAsync();
        TempData["Mensaje"]="El contenido se guardó correctamente.";
        return RedirectToPage("Index");
    }
}
