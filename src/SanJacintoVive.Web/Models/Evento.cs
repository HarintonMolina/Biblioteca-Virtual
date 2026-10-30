using System.ComponentModel.DataAnnotations;

namespace SanJacintoVive.Web.Models;

public class Evento
{
    public int Id { get; set; }
    [Required, StringLength(80), RegularExpression("^[a-z0-9]+$")]
    public string Slug { get; set; } = "";
    [Required, StringLength(180)] public string Titulo { get; set; } = "";
    public DateOnly Fecha { get; set; }
    [Required, StringLength(160)] public string Lugar { get; set; } = "";
    [Required, StringLength(400)] public string Resumen { get; set; } = "";
    [Required, StringLength(12000)] public string Descripcion { get; set; } = "";
    [StringLength(30)] public string Capitulo { get; set; } = "Contexto";
    public string TextoBusqueda { get; set; } = "";
    public ICollection<EventoPersonaje> Personajes { get; set; } = [];
    public ICollection<EventoFuente> Fuentes { get; set; } = [];
    public ICollection<Multimedia> Imagenes { get; set; } = [];
}
