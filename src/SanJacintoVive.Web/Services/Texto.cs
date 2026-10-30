using System.Globalization;
using System.Text;

namespace SanJacintoVive.Web.Services;

public static class Texto
{
    public static string Normalizar(string? value) => string.Concat((value ?? "")
        .Normalize(NormalizationForm.FormD)
        .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark))
        .Normalize(NormalizationForm.FormC).ToLowerInvariant().Trim();

    public static string Fecha(DateOnly value) => value.ToString("d 'de' MMMM 'de' yyyy", CultureInfo.GetCultureInfo("es-NI"));
}
