using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Infrastructure.Licensing;

public class LicenseData
{
    public string MachineId { get; set; } = "";
    public DateTime IssuedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string Signature { get; set; } = "";

    public string ToCanonicalString()
    {
        return $"{MachineId}|{IssuedAt:O}|{ExpiresAt?.ToString("O") ?? ""}";
    }

    public string Serialize()
    {
        return JsonSerializer.Serialize(this);
    }

    public static LicenseData Deserialize(string json)
    {
        return JsonSerializer.Deserialize<LicenseData>(json) ?? throw new InvalidOperationException("Invalid license data");
    }

    public void Sign(RSA privateKey)
    {
        var data = Encoding.UTF8.GetBytes(ToCanonicalString());
        Signature = Convert.ToBase64String(privateKey.SignData(data, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1));
    }

    public bool VerifySignature(RSA publicKey)
    {
        var data = Encoding.UTF8.GetBytes(ToCanonicalString());
        return publicKey.VerifyData(data, Convert.FromBase64String(Signature), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
    }
}
