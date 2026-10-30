using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SanJacintoVive.Web.Models;

namespace SanJacintoVive.Web.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(IServiceProvider services, IConfiguration config, IWebHostEnvironment environment)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        if (db.Database.IsNpgsql()) await db.Database.MigrateAsync();
        else await db.Database.EnsureCreatedAsync();

        if (!await db.EstadoArchivo.AnyAsync(x => x.Id == 1))
        {
            await using var tx = await db.Database.BeginTransactionAsync();
            var path = Path.Combine(environment.ContentRootPath, "Data", "contenido.json");
            var seed = JsonSerializer.Deserialize<Contenido>(await File.ReadAllTextAsync(path), new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
            db.Fuentes.AddRange(seed.Fuentes);
            db.Personajes.AddRange(seed.Personajes.Select(p => new Personaje {
                Id = p.Id, Slug = p.Slug, Nombre = p.Nombre, Bando = p.Bando, Rol = p.Rol, Fechas = p.Fechas, Biografia = p.Biografia,
                Fuentes = p.Fuentes.Select(id => new PersonajeFuente { FuenteId = id }).ToList()
            }));
            db.Eventos.AddRange(seed.Eventos.Select(e => new Evento {
                Id = e.Id, Slug = e.Slug, Titulo = e.Titulo, Fecha = e.Fecha, Lugar = e.Lugar, Resumen = e.Resumen, Descripcion = e.Descripcion, Capitulo = e.Capitulo,
                Fuentes = e.Fuentes.Select(id => new EventoFuente { FuenteId = id }).ToList(),
                Personajes = e.Personajes.Select(id => new EventoPersonaje { PersonajeId = id }).ToList()
            }));
            await db.SaveChangesAsync();
            if (db.Database.IsNpgsql())
                await db.Database.ExecuteSqlRawAsync("""
                    SELECT setval(pg_get_serial_sequence('"Eventos"', 'Id'), (SELECT MAX("Id") FROM "Eventos"));
                    SELECT setval(pg_get_serial_sequence('"Personajes"', 'Id'), (SELECT MAX("Id") FROM "Personajes"));
                    SELECT setval(pg_get_serial_sequence('"Fuentes"', 'Id'), (SELECT MAX("Id") FROM "Fuentes"));
                    """);
            db.EstadoArchivo.Add(new EstadoArchivo { Id = 1 });
            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }

        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        if (!await roles.RoleExistsAsync("Administrador")) await roles.CreateAsync(new IdentityRole("Administrador"));
        var email = config["BootstrapAdmin:Email"];
        var password = config["BootstrapAdmin:Password"];
        if (!string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(password))
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
            if (await users.FindByEmailAsync(email) is null)
            {
                var user = new IdentityUser { Email = email, UserName = email, EmailConfirmed = true };
                var result = await users.CreateAsync(user, password);
                if (!result.Succeeded) throw new InvalidOperationException("La cuenta administradora no cumple los requisitos de seguridad de Identity.");
                var roleResult = await users.AddToRoleAsync(user, "Administrador");
                if (!roleResult.Succeeded) throw new InvalidOperationException("No se pudo asignar el rol de administración.");
            }
        }
    }

    public record Contenido(List<Fuente> Fuentes, List<PersonajeSeed> Personajes, List<EventoSeed> Eventos);
    public record PersonajeSeed(int Id, string Slug, string Nombre, string Bando, string Rol, string Fechas, string Biografia, List<int> Fuentes);
    public record EventoSeed(int Id, string Slug, string Titulo, DateOnly Fecha, string Lugar, string Resumen, string Descripcion, string Capitulo, List<int> Fuentes, List<int> Personajes);
}
