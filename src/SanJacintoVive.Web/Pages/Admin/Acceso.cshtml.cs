using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
namespace SanJacintoVive.Web.Pages.Admin;
public class AccesoModel(SignInManager<IdentityUser> signIn) : PageModel
{
    [BindProperty, Required, EmailAddress] public string Correo { get; set; } = "";
    [BindProperty, Required, DataType(DataType.Password)] public string Clave { get; set; } = "";
    public IActionResult OnGet() => User.IsInRole("Administrador") ? RedirectToPage("Index") : Page();
    public async Task<IActionResult> OnPostAsync(string? returnUrl)
    {
        if (!ModelState.IsValid) return Page();
        var result = await signIn.PasswordSignInAsync(Correo, Clave, false, lockoutOnFailure:true);
        if (result.Succeeded) return LocalRedirect(Url.IsLocalUrl(returnUrl) ? returnUrl! : "/admin");
        ModelState.AddModelError("", "No se pudo iniciar sesión. Revisá las credenciales o intentá nuevamente más tarde.");
        return Page();
    }
}
