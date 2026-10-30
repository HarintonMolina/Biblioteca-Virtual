using System.ComponentModel.DataAnnotations;

namespace SanJacintoVive.Web.Models;

public class Personaje
{
    public int Id { get; set; }
    [Required, StringLength(80), RegularExpression("^[a-z0-9]+$")]
    public string Slug { get; set; } = "";
    [Required, StringLength(140)] public string Nombre { get; set; } = "";
    [Required, StringLength(100)] public string Bando { get; set; } = "";
    [Required, StringLength(180)] public string Rol { get; set; } = "";
    [StringLength(100)] public string Fechas { get; set; } = "";
    [Required, StringLength(12000)] public string Biografia { get; set; } = "";
    public string TextoBusqueda { get; set; } = "";
    public ICollection<EventoPersonaje> Eventos { get; set; } = [];
    public ICollection<PersonajeFuente> Fuentes { get; set; } = [];
    public ICollection<Multimedia> Imagenes { get; set; } = [];
}
