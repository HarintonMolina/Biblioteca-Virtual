using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SanJacintoVive.Web.Data;
using SanJacintoVive.Web.Models;

namespace SanJacintoVive.Web.Pages;
public class LineaTiempoModel(ApplicationDbContext db) : PageModel
{
    public List<Evento> Eventos { get; private set; } = [];
    public async Task OnGetAsync() => Eventos = await db.Eventos.AsNoTracking().OrderBy(x => x.Fecha).ThenBy(x => x.Id).ToListAsync();
}
