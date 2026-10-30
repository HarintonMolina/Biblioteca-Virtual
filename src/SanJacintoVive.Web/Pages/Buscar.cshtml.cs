using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SanJacintoVive.Web.Data;
using SanJacintoVive.Web.Services;
namespace SanJacintoVive.Web.Pages;
public class BuscarModel(ApplicationDbContext db) : PageModel
{
    [BindProperty(SupportsGet=true), StringLength(120)] public string? Q { get; set; }
    public List<Resultado> Resultados { get; private set; } = [];
    public async Task OnGetAsync()
    {
        if(!ModelState.IsValid || string.IsNullOrWhiteSpace(Q)) return;
        var term = Texto.Normalizar(Q);
        Resultados.AddRange(await db.Eventos.AsNoTracking().Where(x=>x.TextoBusqueda.Contains(term)).OrderBy(x=>x.Fecha)
            .Select(x=>new Resultado(x.Titulo,x.Resumen,"Acontecimiento","/eventos/"+x.Slug)).ToListAsync());
        Resultados.AddRange(await db.Personajes.AsNoTracking().Where(x=>x.TextoBusqueda.Contains(term)).OrderBy(x=>x.Id)
            .Select(x=>new Resultado(x.Nombre,x.Rol,"Protagonista","/personajes/"+x.Slug)).ToListAsync());
        Resultados.AddRange(await db.Fuentes.AsNoTracking().Where(x=>x.TextoBusqueda.Contains(term)).OrderBy(x=>x.Id)
            .Select(x=>new Resultado(x.Titulo,x.Autor,"Fuente","/biblioteca/"+x.Slug)).ToListAsync());
    }
    public record Resultado(string Titulo, string Resumen, string Tipo, string Enlace);
}
