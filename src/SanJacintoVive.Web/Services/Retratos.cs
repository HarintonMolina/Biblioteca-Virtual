namespace SanJacintoVive.Web.Services;

public sealed record Retrato(string Ruta, string Descripcion, string Credito, string? Fuente = null);

public static class Retratos
{
    private static readonly IReadOnlyDictionary<string, Retrato> Coleccion = new Dictionary<string, Retrato>
    {
        ["estrada"] = new("/images/retratos/estrada.webp", "José Dolores Estrada, grabado reinterpretado con IA a partir de su retrato histórico", "Reinterpretación con IA del retrato histórico de autor desconocido, en dominio público. Se conservan sus rasgos y el estilo de época.", "https://commons.wikimedia.org/wiki/File:Jos%C3%A9_Dolores_Estrada.jpg"),
        ["walker"] = new("/images/retratos/walker.webp", "William Walker, grabado reinterpretado con IA a partir del retrato de George Dury", "Reinterpretación con IA del retrato de George Dury. Original: Tennessee State Museum, dominio público. Walker no participó personalmente en esta batalla.", "https://commons.wikimedia.org/wiki/File:Portrait_of_William_Walker_by_George_Dury_(cropped).jpg"),
        ["castro"] = new("/images/retratos/castro.webp", "Interpretación artística de Andrés Castro con una piedra en la mano", "Recreación con IA inspirada en la iconografía conmemorativa de Andrés Castro. Referencia: IsaMAG27, CC BY-SA 4.0; adaptación al estilo de grabado. No es un retrato tomado del natural.", "https://commons.wikimedia.org/wiki/File:Estatua_de_Andres_Castro_Estrada.png"),
        ["flecheros"] = new("/images/retratos/flecheros.webp", "Interpretación de un grupo de flecheros de Matagalpa en estilo de grabado", "Recreación colectiva con IA de combatientes indígenas de Matagalpa. No identifica a personas documentadas ni representa el tamaño del contingente."),
        ["cole"] = Crear("cole", "Byron Cole"),
        ["oneal"] = Crear("oneal", "Calvin O’Neal"),
        ["cisne"] = Crear("cisne", "Liberato Cisne"),
        ["siero"] = Crear("siero", "José Siero"),
        ["fonseca"] = Crear("fonseca", "Tomás Fonseca")
    };

    private static Retrato Crear(string slug, string nombre) => new($"/images/retratos/{slug}.webp", $"Recreación artística de {nombre} en estilo de grabado", "Recreación con IA de aspecto y vestimenta de época. No se ha verificado un retrato individual de referencia; el rostro es una interpretación artística.");
    public static Retrato? Obtener(string slug) => Coleccion.GetValueOrDefault(slug);
}
