using System.Net;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SanJacintoVive.Web.Data;
using SanJacintoVive.Web.Models;
using SanJacintoVive.Web.Services;
using Xunit;

namespace SanJacintoVive.Tests;

[CollectionDefinition("Museo", DisableParallelization=true)]
public class MuseoCollection : ICollectionFixture<MuseoFactory> { }

[Collection("Museo")]
public class MuseoTests(MuseoFactory factory)
{
    [Theory]
    [InlineData("/")][InlineData("/lineatiempo")][InlineData("/batalla")]
    [InlineData("/personajes")][InlineData("/biblioteca")][InlineData("/aprender")]
    [InlineData("/personajes/estrada")][InlineData("/eventos/sanjacinto")]
    [InlineData("/biblioteca/arellano")][InlineData("/privacidad")]
    public async Task PublicoSinCuentaYsinIntegrantes(string path)
    {
        using var client=factory.Cliente(); var response=await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK,response.StatusCode);
        var html=await response.Content.ReadAsStringAsync();
        Assert.Contains("lang=\"es\"",html); Assert.DoesNotContain("Lorem ipsum",html,StringComparison.OrdinalIgnoreCase);
        foreach(var name in new[]{"Harinton","Ángel Acosta","Integrantes","[Insertar"}) Assert.DoesNotContain(name,html,StringComparison.OrdinalIgnoreCase);
        Assert.Contains("script-src 'self'",response.Headers.GetValues("Content-Security-Policy").Single());
    }

    [Fact] public async Task DatosOrdenadosYvinculadosAFuentes()
    {
        using var scope=factory.Services.CreateScope(); var db=scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(11,await db.Eventos.CountAsync()); Assert.Equal(9,await db.Personajes.CountAsync());
        Assert.False(await db.Eventos.AnyAsync(x=>!x.Fuentes.Any())); Assert.False(await db.Personajes.AnyAsync(x=>!x.Fuentes.Any()));
        Assert.True((await db.Eventos.SingleAsync(x=>x.Slug=="sanjacinto")).Fecha < (await db.Eventos.SingleAsync(x=>x.Slug=="decretoesclavitud")).Fecha);
        var client=factory.Cliente(); var html=await client.GetStringAsync("/lineatiempo");
        Assert.True(html.IndexOf("La independencia centroamericana",StringComparison.Ordinal) < html.IndexOf("La rendici",StringComparison.Ordinal));
    }

    [Theory][InlineData("/eventos/desconocido")][InlineData("/personajes/desconocido")][InlineData("/biblioteca/desconocido")]
    public async Task ContenidoInexistenteDevuelve404(string path)
    { using var client=factory.Cliente(); Assert.Equal(HttpStatusCode.NotFound,(await client.GetAsync(path)).StatusCode); }

    [Theory][InlineData("Estrada")][InlineData("estrada")][InlineData("Matagálpa")]
    public async Task BusquedaToleraMayusculasYTildes(string term)
    {
        using var client=factory.Cliente(); var html=await client.GetStringAsync("/buscar?q="+Uri.EscapeDataString(term));
        Assert.Contains("class=\"search-result\"",html);
    }

    [Fact] public async Task BusquedaSinResultadosNoFalla()
    { using var client=factory.Cliente(); var html=await client.GetStringAsync("/buscar?q=xyzabcdefg"); Assert.DoesNotContain("class=\"search-result\"",html); }

    [Fact] public async Task CatalogoNoExponeUsuarios()
    { using var client=factory.Cliente(); var json=await client.GetStringAsync("/api/catalogo"); Assert.Contains("sanjacinto",json); Assert.DoesNotContain(Email(),json); }

    [Theory][InlineData("/admin")][InlineData("/admin/editarevento")][InlineData("/admin/imagenes")]
    public async Task AdministracionProtegida(string path)
    { using var client=factory.Cliente(); var r=await client.GetAsync(path); Assert.Equal(HttpStatusCode.Redirect,r.StatusCode); Assert.Contains("admin/acceso",r.Headers.Location!.OriginalString); }

    [Fact] public async Task PostSinAntiforgeryEsRechazado()
    { using var client=factory.Cliente(); var r=await client.PostAsync("/admin/acceso",new FormUrlEncodedContent(new Dictionary<string,string>{{"Correo",Email()},{"Clave",MuseoFactory.Password}})); Assert.Equal(HttpStatusCode.BadRequest,r.StatusCode); }

    [Fact] public async Task LoginInvalidoNoDaAcceso()
    {
        using var client=factory.Cliente(); var r=await Post(client,"/admin/acceso",new(){{"Correo",Email()},{"Clave","InvalidPassword!123"}});
        Assert.Equal(HttpStatusCode.OK,r.StatusCode); Assert.Equal(HttpStatusCode.Redirect,(await client.GetAsync("/admin")).StatusCode);
    }

    [Fact] public async Task LoginNoRedirigeFueraDelSitioYcierraSesion()
    {
        using var client=factory.Cliente(); var r=await Post(client,"/admin/acceso?returnUrl=https%3A%2F%2Fexample.com",new(){{"Correo",Email()},{"Clave",MuseoFactory.Password}});
        Assert.Equal("/admin",r.Headers.Location!.OriginalString); Assert.Contains(r.Headers.GetValues("Set-Cookie"),x=>x.Contains("httponly",StringComparison.OrdinalIgnoreCase)&&x.Contains("samesite=strict",StringComparison.OrdinalIgnoreCase));
        Assert.Equal(HttpStatusCode.OK,(await client.GetAsync("/admin")).StatusCode);
        await Post(client,"/admin/salir",new(),"/admin"); Assert.Equal(HttpStatusCode.Redirect,(await client.GetAsync("/admin")).StatusCode);
    }

    [Fact] public async Task CicloCompletoDeContenidoRelacionesYeliminacion()
    {
        using var client=await Login();
        var source=new Dictionary<string,string>{{"Input.Titulo","Fuente de prueba"},{"Input.Slug","pruebafuente"},{"Input.Autor","Archivo de prueba"},{"Input.Ano","1856"},{"Input.Tipo","Primaria"},{"Input.Enlace","https://example.org/documento"},{"Input.Referencia","Archivo (1856). Documento."},{"Input.Descripcion","Descripción de prueba."},{"Input.Nota","Lectura de prueba."}};
        Assert.Equal(HttpStatusCode.Redirect,(await Post(client,"/admin/editarfuente",source)).StatusCode);
        var fuenteId=await IdFuente("pruebafuente");
        var person=new Dictionary<string,string>{{"Input.Nombre","Protagonista de prueba"},{"Input.Slug","pruebapersonaje"},{"Input.Bando","Defensa"},{"Input.Rol","Participante"},{"Input.Fechas","1856"},{"Input.Biografia","Biografía de prueba."},{"FuenteIds",fuenteId.ToString()}};
        Assert.Equal(HttpStatusCode.Redirect,(await Post(client,"/admin/editarpersonaje",person)).StatusCode);
        int personId;
        using(var scope=factory.Services.CreateScope()) personId=(await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Personajes.SingleAsync(x=>x.Slug=="pruebapersonaje")).Id;
        var data=new Dictionary<string,string>{{"Input.Titulo","Evento de prueba"},{"Input.Slug","pruebaevento"},{"Input.Fecha","1856-09-15"},{"Input.Lugar","Lugar de prueba"},{"Input.Capitulo","Prueba"},{"Input.Resumen","Resumen de prueba"},{"Input.Descripcion","Relato de prueba"},{"FuenteIds",fuenteId.ToString()},{"PersonajeIds",personId.ToString()}};
        Assert.Equal(HttpStatusCode.Redirect,(await Post(client,"/admin/editarevento",data)).StatusCode);
        int id;
        using(var scope=factory.Services.CreateScope()) id=(await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Eventos.SingleAsync(x=>x.Slug=="pruebaevento")).Id;
        var publicHtml=await client.GetStringAsync("/eventos/pruebaevento"); Assert.Contains("pruebafuente",publicHtml); Assert.Contains("pruebapersonaje",publicHtml);
        data["Input.Id"]=id.ToString(); data["Input.Titulo"]="Título corregido";
        Assert.Equal(HttpStatusCode.Redirect,(await Post(client,"/admin/editarevento/"+id,data)).StatusCode);
        Assert.Contains("corregido",await client.GetStringAsync("/eventos/pruebaevento"));
        await Post(client,"/admin?handler=Eliminar",new(){{"tipo","fuente"},{"id",fuenteId.ToString()}},"/admin");
        Assert.Equal(fuenteId,await IdFuente("pruebafuente"));
        await Post(client,"/admin?handler=Eliminar",new(){{"tipo","evento"},{"id",id.ToString()}},"/admin");
        Assert.Equal(HttpStatusCode.NotFound,(await client.GetAsync("/eventos/pruebaevento")).StatusCode);
        person["Input.Id"]=personId.ToString(); person["Input.Nombre"]="Protagonista editado";
        Assert.Equal(HttpStatusCode.Redirect,(await Post(client,"/admin/editarpersonaje/"+personId,person)).StatusCode);
        await Post(client,"/admin?handler=Eliminar",new(){{"tipo","personaje"},{"id",personId.ToString()}},"/admin");
        source["Input.Id"]=fuenteId.ToString(); source["Input.Titulo"]="Fuente editada";
        Assert.Equal(HttpStatusCode.Redirect,(await Post(client,"/admin/editarfuente/"+fuenteId,source)).StatusCode);
        await Post(client,"/admin?handler=Eliminar",new(){{"tipo","fuente"},{"id",fuenteId.ToString()}},"/admin");
        Assert.Equal(HttpStatusCode.NotFound,(await client.GetAsync("/biblioteca/pruebafuente")).StatusCode);
    }

    [Fact] public async Task ArchivoInvalidoNoSeGuardaYunaImagenSePublica()
    {
        using var client=await Login();
        async Task<HttpResponseMessage> Upload(byte[] bytes,string filename) {
            var token=Token(await client.GetStringAsync("/admin/imagenes")); var content=new MultipartFormDataContent();
            content.Add(new StringContent(token),"__RequestVerificationToken"); content.Add(new StringContent("evento:9"),"Destino");
            content.Add(new StringContent("Imagen de prueba"),"Descripcion"); content.Add(new StringContent("Archivo de prueba, CC0"),"Credito");
            content.Add(new ByteArrayContent(bytes),"Archivo",filename); return await client.PostAsync("/admin/imagenes",content);
        }
        var bad=await Upload("<script>alert(1)</script>"u8.ToArray(),"falsa.jpg"); Assert.Equal(HttpStatusCode.OK,bad.StatusCode); Assert.Contains("no coincide",await bad.Content.ReadAsStringAsync());
        var png=Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=");
        Assert.Equal(HttpStatusCode.Redirect,(await Upload(png,"../../imagen.png")).StatusCode);
        Multimedia image;
        using(var scope=factory.Services.CreateScope()) image=await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Multimedia.SingleAsync(x=>x.Descripcion=="Imagen de prueba");
        Assert.Matches("^/archivos/[a-f0-9]{32}\\.png$",image.Ruta);
        Assert.Equal(png,await client.GetByteArrayAsync(image.Ruta)); Assert.Contains(image.Ruta,await client.GetStringAsync("/eventos/sanjacinto"));
        await Post(client,"/admin?handler=Eliminar",new(){{"tipo","imagen"},{"id",image.Id.ToString()}},"/admin");
        Assert.Equal(HttpStatusCode.NotFound,(await client.GetAsync(image.Ruta)).StatusCode);
    }

    [Theory][InlineData("José Dolores Estrada","jose dolores estrada")][InlineData("  MATAGÁLPA  ","matagalpa")]
    public void NormalizacionParaBusqueda(string input,string expected) => Assert.Equal(expected,Texto.Normalizar(input));

    [Fact] public async Task SemillaNoDuplicaContenido()
    {
        var config=factory.Services.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
        var env=factory.Services.GetRequiredService<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>();
        await DbInitializer.InitializeAsync(factory.Services,config,env);
        using var scope=factory.Services.CreateScope(); Assert.Equal(11,await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Eventos.CountAsync());
    }

    private static string Email()=>MuseoFactory.Email;
    private async Task<int> IdFuente(string slug) { using var scope=factory.Services.CreateScope(); return (await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Fuentes.SingleAsync(x=>x.Slug==slug)).Id; }
    private async Task<HttpClient> Login() { var client=factory.Cliente(); var r=await Post(client,"/admin/acceso",new(){{"Correo",Email()},{"Clave",MuseoFactory.Password}}); Assert.Equal(HttpStatusCode.Redirect,r.StatusCode); return client; }
    private static string Token(string html) => WebUtility.HtmlDecode(Regex.Match(html,"name=\"__RequestVerificationToken\"[^>]*value=\"([^\"]+)\"").Groups[1].Value);
    private static async Task<HttpResponseMessage> Post(HttpClient client,string path,Dictionary<string,string> fields,string? tokenPath=null) {
        fields=new(fields){{"__RequestVerificationToken",Token(await client.GetStringAsync(tokenPath??path))}};
        return await client.PostAsync(path,new FormUrlEncodedContent(fields));
    }
}
