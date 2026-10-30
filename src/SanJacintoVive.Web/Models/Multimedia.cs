using System.ComponentModel.DataAnnotations;

namespace SanJacintoVive.Web.Models;

public class Multimedia
{
    public int Id { get; set; }
    [Required, StringLength(180)] public string Ruta { get; set; } = "";
    [Required, StringLength(300)] public string Descripcion { get; set; } = "";
    [Required, StringLength(300)] public string Credito { get; set; } = "";
    public int? EventoId { get; set; }
    public Evento? Evento { get; set; }
    public int? PersonajeId { get; set; }
    public Personaje? Personaje { get; set; }
}
