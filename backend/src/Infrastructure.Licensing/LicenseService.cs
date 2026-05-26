using System.Security.Cryptography;

namespace Infrastructure.Licensing;

public class LicenseService
{
    private readonly RSA _publicKey;

    public LicenseService(string publicKeyPem)
    {
        _publicKey = RSA.Create();
        _publicKey.ImportFromPem(publicKeyPem);
    }

    public bool IsLicensed(string licenseFilePath)
    {
        if (!File.Exists(licenseFilePath))
            return false;

        try
        {
            var json = File.ReadAllText(licenseFilePath);
            var license = LicenseData.Deserialize(json);

            if (!license.VerifySignature(_publicKey))
                return false;

            if (license.ExpiresAt.HasValue && license.ExpiresAt.Value < DateTime.UtcNow)
                return false;

            var currentId = MachineIdProvider.GetMachineId();
            return license.MachineId == currentId;
        }
        catch
        {
            return false;
        }
    }

    public LicenseInfo GetStatus(string licenseFilePath)
    {
        if (!File.Exists(licenseFilePath))
            return new LicenseInfo { IsLicensed = false, MachineId = MachineIdProvider.GetMachineId() };

        try
        {
            var json = File.ReadAllText(licenseFilePath);
            var license = LicenseData.Deserialize(json);

            if (!license.VerifySignature(_publicKey))
                return new LicenseInfo { IsLicensed = false, MachineId = MachineIdProvider.GetMachineId() };

            if (license.ExpiresAt.HasValue && license.ExpiresAt.Value < DateTime.UtcNow)
                return new LicenseInfo { IsLicensed = false, Reason = "License expired", MachineId = MachineIdProvider.GetMachineId() };

            var currentId = MachineIdProvider.GetMachineId();
            if (license.MachineId != currentId)
                return new LicenseInfo { IsLicensed = false, Reason = "License bound to different machine", MachineId = currentId };

            return new LicenseInfo { IsLicensed = true, MachineId = currentId, IssuedAt = license.IssuedAt, ExpiresAt = license.ExpiresAt };
        }
        catch
        {
            return new LicenseInfo { IsLicensed = false, MachineId = MachineIdProvider.GetMachineId() };
        }
    }
}

public class LicenseInfo
{
    public bool IsLicensed { get; set; }
    public string? Reason { get; set; }
    public string MachineId { get; set; } = "";
    public DateTime? IssuedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}
