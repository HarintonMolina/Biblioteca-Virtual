using System.Net;
using System.Text.RegularExpressions;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SanJacintoVive.Web.Data;
using Xunit;

namespace SanJacintoVive.Tests;

public class ExportacionTests
{
    [Fact]
    public async Task ExportarMuseoPublicoDesdeRazor()
    {
        var destination=Environment.GetEnvironmentVariable("EXPORT_DIRECTORY");
        if(string.IsNullOrWhiteSpace(destination)) return;
        using var factory=new MuseoFactory(postgres:false);
        using var client=factory.Cliente();
        using var scope=factory.Services.CreateScope();
        var db=scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var paths=new List<string>{"/","/lineatiempo","/batalla","/personajes","/biblioteca","/buscar","/aprender","/privacidad"};
        paths.AddRange(await db.Eventos.Select(x=>"/eventos/"+x.Slug).ToListAsync());
        paths.AddRange(await db.Personajes.Select(x=>"/personajes/"+x.Slug).ToListAsync());
        paths.AddRange(await db.Fuentes.Select(x=>"/biblioteca/"+x.Slug).ToListAsync());
        destination=Path.GetFullPath(destination);
        if(Path.GetFileName(destination)!="docs") throw new InvalidOperationException("La exportación solo puede escribir en una carpeta llamada docs.");
        if(Directory.Exists(destination)) Directory.Delete(destination,true);
        Directory.CreateDirectory(destination);
        foreach(var path in paths)
        {
            var response=await client.GetAsync(path); Assert.Equal(HttpStatusCode.OK,response.StatusCode);
            var html=await response.Content.ReadAsStringAsync();
            var segments=path.Trim('/').Split('/',StringSplitOptions.RemoveEmptyEntries);
            var prefix=segments.Length==0 ? "./" : string.Concat(Enumerable.Repeat("../",segments.Length));
            html=html.Replace("<html lang=\"es\">",$"<html lang=\"es\" data-base=\"{prefix}\">")
                .Replace("data-catalog-url=\"/api/catalogo\"","data-catalog-url=\"/catalogo.json\"");
            html=Regex.Replace(html,"(href|src|action)=\"(/[^\"]*)\"",match=>{
                var original=match.Groups[2].Value;
                var index=original.IndexOfAny(['?','#']);
                var plain=index<0 ? original : original[..index]; var suffix=index<0 ? "" : original[index..];
                var asset=plain.StartsWith("/css/")||plain.StartsWith("/js/")||plain.StartsWith("/images/")||plain.StartsWith("/fonts/");
                var target=prefix+plain.Trim('/')+(asset||plain=="/" ? "" : "/")+suffix;
                return match.Groups[1].Value+"=\""+target+"\"";
            });
            var folder=Path.Combine(destination,Path.Combine(new[]{"."}.Concat(segments).ToArray())); Directory.CreateDirectory(folder);
            await File.WriteAllTextAsync(Path.Combine(folder,"index.html"),html);
        }
        CopyDirectory(factory.WebRoot,destination);
        await File.WriteAllTextAsync(Path.Combine(destination,"catalogo.json"),await client.GetStringAsync("/api/catalogo"));
        await File.WriteAllTextAsync(Path.Combine(destination,"404.html"),"<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><title>San Jacinto Vive</title><h1>Esta historia cambió de lugar.</h1><p>Volvé al <a href=\"/\">inicio del museo</a>.</p></html>");
        await File.WriteAllTextAsync(Path.Combine(destination,".nojekyll"),"");
        await File.WriteAllTextAsync(Path.Combine(destination,"exportacion.json"),JsonSerializer.Serialize(new { paginas=paths.Count, origen="ASP.NET Core Razor Pages", modo="Museo público de lectura; administración en el servidor .NET" }));
    }
    private static void CopyDirectory(string source,string destination)
    {
        foreach(var file in Directory.GetFiles(source,"*",SearchOption.AllDirectories)) {
            var target=Path.Combine(destination,Path.GetRelativePath(source,file)); Directory.CreateDirectory(Path.GetDirectoryName(target)!); File.Copy(file,target,true);
        }
    }
}
