using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SanJacintoVive.Web.Data;
using SanJacintoVive.Web.Models;
namespace SanJacintoVive.Web.Pages.Biblioteca;
public class DetalleModel(ApplicationDbContext db) : PageModel
{
    public Fuente Fuente { get; private set; } = null!;
    public async Task<IActionResult> OnGetAsync(string slug)
    {
        var f = await db.Fuentes.AsNoTracking().Include(x=>x.Eventos).ThenInclude(x=>x.Evento).SingleOrDefaultAsync(x=>x.Slug==slug);
        if(f is null) return NotFound(); Fuente=f; return Page();
    }
}
