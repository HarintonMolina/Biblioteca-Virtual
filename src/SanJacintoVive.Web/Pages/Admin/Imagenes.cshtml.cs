using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SanJacintoVive.Web.Data;
using SanJacintoVive.Web.Models;
using SanJacintoVive.Web.Services;
namespace SanJacintoVive.Web.Pages.Admin;
[RequestSizeLimit(6 * 1024 * 1024)]
[RequestFormLimits(MultipartBodyLengthLimit=6 * 1024 * 1024)]
public class ImagenesModel(ApplicationDbContext db, ArchivoService archivos) : PageModel
{
    [BindProperty, Required] public IFormFile? Archivo { get; set; }
    [BindProperty, Required, StringLength(300)] public string Descripcion { get; set; } = "";
    [BindProperty, Required, StringLength(300)] public string Credito { get; set; } = "";
    [BindProperty, Required] public string Destino { get; set; } = "";
    public List<Evento> Eventos { get; private set; } = [];
    public List<Personaje> Personajes { get; private set; } = [];
    private async Task CargarAsync() {
        Eventos = await db.Eventos.AsNoTracking().OrderBy(x=>x.Fecha).ToListAsync();
        Personajes = await db.Personajes.AsNoTracking().OrderBy(x=>x.Nombre).ToListAsync();
    }
    public async Task OnGetAsync() => await CargarAsync();
    public async Task<IActionResult> OnPostAsync()
    {
        await CargarAsync();
        var parts=Destino.Split(':');
        if(parts.Length!=2 || !int.TryParse(parts[1],out var id) ||
            !(parts[0]=="evento" && Eventos.Any(x=>x.Id==id) || parts[0]=="personaje" && Personajes.Any(x=>x.Id==id))) {
            ModelState.AddModelError("Destino", "Elegí un evento o personaje existente."); return Page();
        }
        if(!ModelState.IsValid) return Page();
        string ruta;
        try { ruta=await archivos.GuardarAsync(Archivo!,HttpContext.RequestAborted); }
        catch(InvalidDataException e) { ModelState.AddModelError("Archivo",e.Message); return Page(); }
        try {
            db.Multimedia.Add(new Multimedia { Ruta=ruta, Descripcion=Descripcion, Credito=Credito,
                EventoId=parts[0]=="evento" ? id : null, PersonajeId=parts[0]=="personaje" ? id : null });
            await db.SaveChangesAsync();
        } catch { archivos.Eliminar(ruta); throw; }
        TempData["Mensaje"]="La imagen se guardó y vinculó correctamente."; return RedirectToPage("Index");
    }
}
