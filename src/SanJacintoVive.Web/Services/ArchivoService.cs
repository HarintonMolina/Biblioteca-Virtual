namespace SanJacintoVive.Web.Services;

public class ArchivoService(IConfiguration configuration, IWebHostEnvironment environment)
{
    public const long MaxBytes = 5 * 1024 * 1024;
    private readonly string root = Path.Combine(configuration["Storage:Root"] ?? Path.Combine(environment.ContentRootPath, "AppData"), "imagenes");

    public async Task<string> GuardarAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file.Length is <= 0 or > MaxBytes) throw new InvalidDataException("La imagen debe pesar entre 1 byte y 5 MB.");
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension is not (".jpg" or ".jpeg" or ".png" or ".webp")) throw new InvalidDataException("Usa una imagen JPG, PNG o WebP.");
        await using var input = file.OpenReadStream();
        var signature = new byte[12];
        var length = await input.ReadAtLeastAsync(signature, 12, throwOnEndOfStream: false, cancellationToken);
        var jpg = length >= 3 && signature[0] == 0xFF && signature[1] == 0xD8 && signature[2] == 0xFF;
        var png = length >= 8 && signature.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        var webp = length >= 12 && signature.AsSpan(0, 4).SequenceEqual("RIFF"u8) && signature.AsSpan(8, 4).SequenceEqual("WEBP"u8);
        if (!(jpg && extension is ".jpg" or ".jpeg") && !(png && extension == ".png") && !(webp && extension == ".webp"))
            throw new InvalidDataException("El archivo no coincide con un formato de imagen permitido.");
        Directory.CreateDirectory(root);
        var name = Guid.NewGuid().ToString("N") + (jpg ? ".jpg" : extension);
        var path = Path.Combine(root, name);
        try
        {
            await using var output = new FileStream(path, FileMode.CreateNew);
            await output.WriteAsync(signature.AsMemory(0, length), cancellationToken);
            var total = (long)length;
            var buffer = new byte[81920];
            int read;
            while ((read = await input.ReadAsync(buffer, cancellationToken)) > 0)
            {
                total += read;
                if (total > MaxBytes) throw new InvalidDataException("La imagen supera 5 MB.");
                await output.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
            }
            return "/archivos/" + name;
        }
        catch { if (File.Exists(path)) File.Delete(path); throw; }
    }

    public void Eliminar(string ruta)
    {
        var name = Path.GetFileName(ruta);
        if (ruta != "/archivos/" + name) return;
        var path = Path.Combine(root, name);
        if (File.Exists(path)) File.Delete(path);
    }
}
