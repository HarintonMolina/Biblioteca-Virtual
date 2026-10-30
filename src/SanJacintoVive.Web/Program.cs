using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.DataProtection.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using SanJacintoVive.Web.Data;
using SanJacintoVive.Web.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseNpgsql(
    builder.Configuration.GetConnectionString("Default") ?? "Host=localhost;Database=sanjacinto;Username=sanjacinto"));
builder.Services.AddIdentity<IdentityUser, IdentityRole>(o => {
    o.Password.RequiredLength = 12;
    o.Password.RequireNonAlphanumeric = true;
    o.Lockout.MaxFailedAccessAttempts = 5;
    o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(10);
    o.User.RequireUniqueEmail = true;
}).AddEntityFrameworkStores<ApplicationDbContext>().AddDefaultTokenProviders();
builder.Services.ConfigureApplicationCookie(o => {
    o.LoginPath = "/admin/acceso";
    o.AccessDeniedPath = "/admin/acceso";
    o.Cookie.Name = "SanJacintoVive.Sesion";
    o.Cookie.HttpOnly = true;
    o.Cookie.SameSite = SameSiteMode.Strict;
    o.ExpireTimeSpan = TimeSpan.FromMinutes(45);
    o.SlidingExpiration = true;
});
builder.Services.AddRazorPages(o => {
    o.Conventions.AuthorizeFolder("/Admin", "Administracion");
    o.Conventions.AllowAnonymousToPage("/Admin/Acceso");
});
builder.Services.AddAuthorization(o => o.AddPolicy("Administracion", p => p.RequireRole("Administrador")));
builder.Services.AddScoped<ArchivoService>();
builder.Services.AddHealthChecks().AddDbContextCheck<ApplicationDbContext>();
builder.Services.AddDataProtection().SetApplicationName("SanJacintoVive");
builder.Services.AddOptions<KeyManagementOptions>().Configure<IConfiguration, IWebHostEnvironment, ILoggerFactory>((options, config, env, loggers) => {
    var folder = new DirectoryInfo(Path.Combine(config["Storage:Root"] ?? Path.Combine(env.ContentRootPath, "AppData"), "claves"));
    folder.Create();
    options.XmlRepository = new FileSystemXmlRepository(folder, loggers);
});

var app = builder.Build();
var dataPath = app.Configuration["Storage:Root"] ?? Path.Combine(app.Environment.ContentRootPath, "AppData");
Directory.CreateDirectory(Path.Combine(dataPath, "imagenes"));
if (!app.Environment.IsDevelopment()) { app.UseExceptionHandler("/Error"); app.UseHsts(); }
app.Use(async (context, next) => {
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; frame-src https://www.mined.gob.ni https://www.revistas.una.ac.cr https://revistas.ucr.ac.cr; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
    await next();
});
app.UseStaticFiles();
app.UseStaticFiles(new StaticFileOptions { FileProvider = new PhysicalFileProvider(Path.Combine(dataPath, "imagenes")), RequestPath = "/archivos" });
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapRazorPages();
app.MapHealthChecks("/health");
app.MapGet("/api/catalogo", async (ApplicationDbContext db) => {
    var eventos = await db.Eventos.AsNoTracking().OrderBy(x=>x.Fecha).Select(x=>new { titulo=x.Titulo, resumen=x.Resumen, tipo="Acontecimiento", enlace="/eventos/"+x.Slug, texto=x.TextoBusqueda }).ToListAsync();
    var personajes = await db.Personajes.AsNoTracking().OrderBy(x=>x.Id).Select(x=>new { titulo=x.Nombre, resumen=x.Rol, tipo="Protagonista", enlace="/personajes/"+x.Slug, texto=x.TextoBusqueda }).ToListAsync();
    var fuentes = await db.Fuentes.AsNoTracking().OrderBy(x=>x.Id).Select(x=>new { titulo=x.Titulo, resumen=x.Autor, tipo="Fuente", enlace="/biblioteca/"+x.Slug, texto=x.TextoBusqueda }).ToListAsync();
    return Results.Ok(eventos.Concat(personajes).Concat(fuentes));
});
await DbInitializer.InitializeAsync(app.Services, app.Configuration, app.Environment);
await app.RunAsync();

public partial class Program { }
