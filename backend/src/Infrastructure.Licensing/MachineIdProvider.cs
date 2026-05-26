using System.Security.Cryptography;
using System.Text;

namespace Infrastructure.Licensing;

public static class MachineIdProvider
{
    public static string GetMachineId()
    {
        var parts = new[]
        {
            Environment.MachineName,
            Environment.OSVersion.ToString(),
        };

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(string.Join("|", parts)));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
