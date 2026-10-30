using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SanJacintoVive.Web.Data;
using SanJacintoVive.Web.Models;

namespace SanJacintoVive.Web.Pages.Eventos;
public class DetalleModel(ApplicationDbContext db) : PageModel
{
    public Evento Evento { get; private set; } = null!;
    public async Task<IActionResult> OnGetAsync(string slug)
    {
        var item = await db.Eventos.AsNoTracking().Include(x=>x.Fuentes).ThenInclude(x=>x.Fuente)
            .Include(x=>x.Personajes).ThenInclude(x=>x.Personaje).Include(x=>x.Imagenes).AsSplitQuery().SingleOrDefaultAsync(x=>x.Slug == slug);
        if(item is null) return NotFound();
        Evento = item; return Page();
    }
}
