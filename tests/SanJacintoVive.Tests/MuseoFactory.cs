using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SanJacintoVive.Web.Data;

namespace SanJacintoVive.Tests;

public class MuseoFactory : WebApplicationFactory<Program>
{
    public const string Email = "gestion@example.test";
    public const string Password = "MuseumTest!Password123";
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    private readonly string storage = Path.Combine(Path.GetTempPath(), "sanjacinto" + Guid.NewGuid().ToString("N"));
    private readonly bool usePostgres;
    public string WebRoot => Path.GetFullPath("../../../../../src/SanJacintoVive.Web/wwwroot", AppContext.BaseDirectory);

    public MuseoFactory() : this(true) { }
    internal MuseoFactory(bool postgres) { usePostgres = postgres && !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("TEST_DATABASE")); connection.Open(); }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseContentRoot(Path.GetDirectoryName(WebRoot)!);
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?> {
            ["BootstrapAdmin:Email"]=Email, ["BootstrapAdmin:Password"]=Password, ["Storage:Root"]=storage,
            ["Logging:LogLevel:Default"]="Warning"
        }));
        builder.ConfigureServices(services => {
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();
            services.RemoveAll<ApplicationDbContext>();
            services.AddDbContext<ApplicationDbContext>(options => {
                if(usePostgres) options.UseNpgsql(Environment.GetEnvironmentVariable("TEST_DATABASE"));
                else options.UseSqlite(connection);
            });
        });
    }

    public HttpClient Cliente() => CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect=false, HandleCookies=true });
    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if(disposing) { connection.Dispose(); if(Directory.Exists(storage)) Directory.Delete(storage,true); }
    }
}
