using System.ComponentModel.DataAnnotations;

namespace SanJacintoVive.Web.Models;

public class Fuente
{
    public int Id { get; set; }
    [Required, StringLength(80), RegularExpression("^[a-z0-9]+$")]
    public string Slug { get; set; } = "";
    [Required, StringLength(220)] public string Titulo { get; set; } = "";
    [Required, StringLength(180)] public string Autor { get; set; } = "";
    [Required, StringLength(30)] public string Ano { get; set; } = "";
    [Required, RegularExpression("^(Primaria|Secundaria|Institucional)$")]
    public string Tipo { get; set; } = "Secundaria";
    [Required, StringLength(1200), Url, RegularExpression("^https://.+$")]
    public string Enlace { get; set; } = "";
    [Required, StringLength(1600)] public string Referencia { get; set; } = "";
    [Required, StringLength(2400)] public string Descripcion { get; set; } = "";
    [StringLength(1600)] public string Nota { get; set; } = "";
    public string TextoBusqueda { get; set; } = "";
    public ICollection<EventoFuente> Eventos { get; set; } = [];
    public ICollection<PersonajeFuente> Personajes { get; set; } = [];
}
