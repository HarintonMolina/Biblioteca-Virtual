namespace SanJacintoVive.Web.Models;

public class EventoPersonaje
{
    public int EventoId { get; set; }
    public Evento Evento { get; set; } = null!;
    public int PersonajeId { get; set; }
    public Personaje Personaje { get; set; } = null!;
    public string Rol { get; set; } = "Participación histórica";
}

public class EventoFuente
{
    public int EventoId { get; set; }
    public Evento Evento { get; set; } = null!;
    public int FuenteId { get; set; }
    public Fuente Fuente { get; set; } = null!;
}

public class PersonajeFuente
{
    public int PersonajeId { get; set; }
    public Personaje Personaje { get; set; } = null!;
    public int FuenteId { get; set; }
    public Fuente Fuente { get; set; } = null!;
}
