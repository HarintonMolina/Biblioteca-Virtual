using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SanJacintoVive.Web.Data;
using SanJacintoVive.Web.Models;

namespace SanJacintoVive.Web.Pages.Personajes;
public class IndexModel(ApplicationDbContext db) : PageModel
{
    public List<Personaje> Personajes { get; private set; } = [];
    public async Task OnGetAsync() => Personajes = await db.Personajes.Include(x=>x.Imagenes).AsNoTracking().OrderBy(x=>x.Id).ToListAsync();
}
