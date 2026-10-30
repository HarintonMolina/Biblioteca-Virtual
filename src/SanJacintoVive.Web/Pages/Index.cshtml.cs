using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SanJacintoVive.Web.Data;
using SanJacintoVive.Web.Models;

namespace SanJacintoVive.Web.Pages;

public class IndexModel(ApplicationDbContext db) : PageModel
{
    public List<Evento> Eventos { get; private set; } = [];
    public List<Personaje> Personajes { get; private set; } = [];
    public async Task OnGetAsync()
    {
        Eventos = await db.Eventos.AsNoTracking().Where(x => x.Fecha.Year >= 1855).OrderBy(x => x.Fecha).Take(8).ToListAsync();
        Personajes = await db.Personajes.AsNoTracking().OrderBy(x => x.Id).Take(3).ToListAsync();
    }
}
