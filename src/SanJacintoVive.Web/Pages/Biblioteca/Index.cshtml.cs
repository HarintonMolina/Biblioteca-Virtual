using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SanJacintoVive.Web.Data;
using SanJacintoVive.Web.Models;
namespace SanJacintoVive.Web.Pages.Biblioteca;
public class IndexModel(ApplicationDbContext db) : PageModel
{
    public List<Fuente> Fuentes { get; private set; } = [];
    public async Task OnGetAsync() => Fuentes = await db.Fuentes.AsNoTracking().OrderBy(x=>x.Id).ToListAsync();
}
