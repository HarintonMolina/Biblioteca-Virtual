using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using SanJacintoVive.Web.Data;
using SanJacintoVive.Web.Models;
namespace SanJacintoVive.Web.Pages.Admin;
public class EditarFuenteModel(ApplicationDbContext db) : PageModel
{
    [BindProperty] public Fuente Input { get; set; } = new();

    private async Task CargarAsync() {  await Task.CompletedTask; }
    public async Task<IActionResult> OnGetAsync(int? id)
    {
        await CargarAsync();
        if(id.HasValue) {
            var item=await db.Fuentes.SingleOrDefaultAsync(x=>x.Id==id);
            if(item is null) return NotFound(); Input=item; 
        }
        return Page();
    }
    public async Task<IActionResult> OnPostAsync()
    {
        await CargarAsync();

        if(await db.Fuentes.AnyAsync(x=>x.Slug==Input.Slug && x.Id!=Input.Id)) ModelState.AddModelError("Input.Slug", "Este identificador ya está en uso.");
        if(!ModelState.IsValid) return Page();
        var entity=Input.Id==0 ? new Fuente() : await db.Fuentes.SingleOrDefaultAsync(x=>x.Id==Input.Id);
        if(entity is null) return NotFound();
        entity.Titulo=Input.Titulo;
            entity.Slug=Input.Slug;
            entity.Autor=Input.Autor;
            entity.Ano=Input.Ano;
            entity.Tipo=Input.Tipo;
            entity.Enlace=Input.Enlace;
            entity.Referencia=Input.Referencia;
            entity.Descripcion=Input.Descripcion;
            entity.Nota=Input.Nota;

        if(Input.Id==0) db.Fuentes.Add(entity);
        await db.SaveChangesAsync();
        TempData["Mensaje"]="El contenido se guardó correctamente.";
        return RedirectToPage("Index");
    }
}
