using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SanJacintoVive.Web.Models;
using SanJacintoVive.Web.Services;

namespace SanJacintoVive.Web.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : IdentityDbContext<IdentityUser>(options)
{
    public DbSet<Evento> Eventos => Set<Evento>();
    public DbSet<Personaje> Personajes => Set<Personaje>();
    public DbSet<Fuente> Fuentes => Set<Fuente>();
    public DbSet<Multimedia> Multimedia => Set<Multimedia>();
    public DbSet<EventoPersonaje> EventoPersonajes => Set<EventoPersonaje>();
    public DbSet<EventoFuente> EventoFuentes => Set<EventoFuente>();
    public DbSet<PersonajeFuente> PersonajeFuentes => Set<PersonajeFuente>();
    public DbSet<EstadoArchivo> EstadoArchivo => Set<EstadoArchivo>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        base.OnModelCreating(model);
        model.Entity<Evento>().HasIndex(x => x.Slug).IsUnique();
        model.Entity<Personaje>().HasIndex(x => x.Slug).IsUnique();
        model.Entity<Fuente>().HasIndex(x => x.Slug).IsUnique();
        model.Entity<Evento>().HasIndex(x => x.Fecha);
        model.Entity<EventoPersonaje>().HasKey(x => new { x.EventoId, x.PersonajeId });
        model.Entity<EventoFuente>().HasKey(x => new { x.EventoId, x.FuenteId });
        model.Entity<PersonajeFuente>().HasKey(x => new { x.PersonajeId, x.FuenteId });
        model.Entity<Multimedia>().ToTable("Multimedia", t => t.HasCheckConstraint("CK_Multimedia_Destino",
            "(\"EventoId\" IS NOT NULL AND \"PersonajeId\" IS NULL) OR (\"EventoId\" IS NULL AND \"PersonajeId\" IS NOT NULL)"));
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries().Where(e => e.State is EntityState.Added or EntityState.Modified))
        {
            if (entry.Entity is Evento e) e.TextoBusqueda = Texto.Normalizar($"{e.Titulo} {e.Lugar} {e.Resumen} {e.Descripcion}");
            if (entry.Entity is Personaje p) p.TextoBusqueda = Texto.Normalizar($"{p.Nombre} {p.Rol} {p.Bando} {p.Biografia}");
            if (entry.Entity is Fuente f) f.TextoBusqueda = Texto.Normalizar($"{f.Titulo} {f.Autor} {f.Descripcion}");
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
