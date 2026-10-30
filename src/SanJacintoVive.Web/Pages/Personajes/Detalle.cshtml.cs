using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SanJacintoVive.Web.Data;
using SanJacintoVive.Web.Models;

namespace SanJacintoVive.Web.Pages.Personajes;
public class DetalleModel(ApplicationDbContext db) : PageModel
{
    public Personaje Personaje { get; private set; } = null!;
    public async Task<IActionResult> OnGetAsync(string slug)
    {
        var item = await db.Personajes.AsNoTracking().Include(x=>x.Fuentes).ThenInclude(x=>x.Fuente)
            .Include(x=>x.Eventos).ThenInclude(x=>x.Evento).Include(x=>x.Imagenes).AsSplitQuery().SingleOrDefaultAsync(x=>x.Slug == slug);
        if(item is null) return NotFound();
        Personaje = item; return Page();
    }
}
