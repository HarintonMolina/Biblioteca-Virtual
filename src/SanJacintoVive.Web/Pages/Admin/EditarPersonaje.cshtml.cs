using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SanJacintoVive.Web.Data;
using SanJacintoVive.Web.Models;
namespace SanJacintoVive.Web.Pages.Admin;
public class EditarPersonajeModel(ApplicationDbContext db) : PageModel
{
    [BindProperty] public Personaje Input { get; set; } = new();
    public List<Fuente> Fuentes { get; private set; } = [];
    [BindProperty, MinLength(1, ErrorMessage="Seleccioná al menos una fuente.")] public int[] FuenteIds { get; set; } = [];
    private async Task CargarAsync() { Fuentes = await db.Fuentes.AsNoTracking().OrderBy(x=>x.Id).ToListAsync(); await Task.CompletedTask; }
    public async Task<IActionResult> OnGetAsync(int? id)
    {
        await CargarAsync();
        if(id.HasValue) {
            var item=await db.Personajes.Include(x=>x.Fuentes).SingleOrDefaultAsync(x=>x.Id==id);
            if(item is null) return NotFound(); Input=item; FuenteIds=item.Fuentes.Select(x=>x.FuenteId).ToArray();
        }
        return Page();
    }
    public async Task<IActionResult> OnPostAsync()
    {
        await CargarAsync();
        if(await db.Fuentes.CountAsync(x=>FuenteIds.Distinct().Contains(x.Id))!=FuenteIds.Distinct().Count()) ModelState.AddModelError("", "Una de las fuentes ya no existe.");
        if(await db.Personajes.AnyAsync(x=>x.Slug==Input.Slug && x.Id!=Input.Id)) ModelState.AddModelError("Input.Slug", "Este identificador ya está en uso.");
        if(!ModelState.IsValid) return Page();
        var entity=Input.Id==0 ? new Personaje() : await db.Personajes.Include(x=>x.Fuentes).SingleOrDefaultAsync(x=>x.Id==Input.Id);
        if(entity is null) return NotFound();
        entity.Nombre=Input.Nombre;
            entity.Slug=Input.Slug;
            entity.Bando=Input.Bando;
            entity.Rol=Input.Rol;
            entity.Fechas=Input.Fechas;
            entity.Biografia=Input.Biografia;
        foreach(var link in entity.Fuentes.Where(x=>!FuenteIds.Contains(x.FuenteId)).ToList()) entity.Fuentes.Remove(link);
        foreach(var id in FuenteIds.Distinct().Where(id=>!entity.Fuentes.Any(x=>x.FuenteId==id))) entity.Fuentes.Add(new PersonajeFuente { FuenteId=id });
        if(Input.Id==0) db.Personajes.Add(entity);
        await db.SaveChangesAsync();
        TempData["Mensaje"]="El contenido se guardó correctamente.";
        return RedirectToPage("Index");
    }
}
