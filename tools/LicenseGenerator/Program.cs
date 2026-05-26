using System.Globalization;
using System.Security.Cryptography;
using Infrastructure.Licensing;

if (args.Length < 2)
{
    Console.Error.WriteLine("""
Usage:
  LicenseGenerator keygen <private-key-file> <public-key-file>
      Generate a new RSA key pair

  LicenseGenerator sign <private-key-file> <machine-id> <output-file> [expiration]
      Generate a license file.
      expiration: optional, e.g. "30d" / "6m" / "1y" or "2026-12-31"
""");
    return 1;
}

switch (args[0])
{
    case "keygen":
    {
        using var rsa = RSA.Create(2048);
        File.WriteAllText(args[1], rsa.ExportRSAPrivateKeyPem());
        File.WriteAllText(args[2], rsa.ExportRSAPublicKeyPem());
        Console.WriteLine($"Private key saved to {args[1]}");
        Console.WriteLine($"Public key saved to {args[2]}");
        break;
    }
    case "sign":
    {
        if (args.Length < 4)
        {
            Console.Error.WriteLine("Usage: LicenseGenerator sign <private-key-file> <machine-id> <output-file> [expiration]");
            return 1;
        }

        var privateKey = RSA.Create();
        privateKey.ImportFromPem(File.ReadAllText(args[1]));

        DateTime? expiresAt = null;
        if (args.Length >= 5)
        {
            expiresAt = ParseExpiration(args[4]);
        }

        var license = new LicenseData
        {
            MachineId = args[2],
            IssuedAt = DateTime.UtcNow,
            ExpiresAt = expiresAt,
        };

        license.Sign(privateKey);
        File.WriteAllText(args[3], license.Serialize());
        Console.WriteLine($"License saved to {args[3]}");
        if (expiresAt.HasValue)
            Console.WriteLine($"Expires: {expiresAt:yyyy-MM-dd}");
        break;
    }
    default:
        Console.Error.WriteLine($"Unknown command: {args[0]}");
        return 1;
}

return 0;

static DateTime ParseExpiration(string value)
{
    // Absolute date: "2026-12-31" or "2026-12-31T23:59:59"
    if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var date))
        return date.ToUniversalTime();

    // Relative duration: "30d" / "6m" / "1y"
    var span = value.AsSpan();
    if (span.Length < 2)
        throw new ArgumentException($"Invalid expiration format: {value}. Use e.g. \"30d\", \"6m\", \"1y\", or \"2026-12-31\"");

    var number = int.Parse(span[..^1]);
    var unit = span[^1];

    return unit switch
    {
        'd' => DateTime.UtcNow.AddDays(number),
        'm' => DateTime.UtcNow.AddMonths(number),
        'y' => DateTime.UtcNow.AddYears(number),
        _ => throw new ArgumentException($"Unknown unit '{unit}'. Use d (days), m (months), or y (years)."),
    };
}
