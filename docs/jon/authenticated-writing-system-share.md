# Authenticated SMB Share Runbook

This replaces the old Guest-based SMB path with a real local Windows account so Ubuntu can mount `\\192.168.0.110\writing-system` using credentials instead of `-o guest`.

## 1. Run the Windows setup script as Administrator

From an elevated PowerShell window on the Windows host:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\writing-system\scripts\setup-authenticated-writing-system-share.ps1"
```

What the script does:

- reuses or creates `smbuser`
- sets a nonblank password
- marks the account password as required
- disables Guest-only local-account mapping by setting `forceguest=0`
- grants `JON\smbuser` explicit share access on `writing-system`
- grants `JON\smbuser` explicit NTFS modify access on `E:\writing-system`
- writes the generated credentials to `E:\writing-system\.deploy-secrets\writing-system-smb.txt`
- runs a local Windows SMB login self-test unless `-SkipSelfTest` is passed

## 2. Copy the credentials onto Ubuntu

Read the generated secret file on Windows:

`E:\writing-system\.deploy-secrets\writing-system-smb.txt`

Then create the Ubuntu credentials file:

```bash
sudo install -m 600 /dev/null /root/.smb-writing-system
sudoedit /root/.smb-writing-system
```

Paste only:

```ini
username=smbuser
password=<password from writing-system-smb.txt>
```

## 3. Mount from Ubuntu

```bash
sudo mkdir -p /mnt/writing-system
sudo mount -t cifs //192.168.0.110/writing-system /mnt/writing-system \
  -o credentials=/root/.smb-writing-system,vers=3.0,uid=$(id -u),gid=$(id -g)
```

## 4. Verify

```bash
ls -la /mnt/writing-system
touch /mnt/writing-system/.codex-smb-write-test
rm /mnt/writing-system/.codex-smb-write-test
```

If the mount still fails:

```bash
sudo mount -t cifs //192.168.0.110/writing-system /mnt/writing-system \
  -o credentials=/root/.smb-writing-system,vers=3.0,uid=$(id -u),gid=$(id -g) --verbose
dmesg -T | tail -n 50
cat /proc/fs/cifs/DebugData
```

## 5. Windows-side verification commands

Run these on the Windows host if you need to inspect the final state:

```powershell
Get-SmbServerConfiguration | Format-List RequireSecuritySignature,EnableSecuritySignature
Get-SmbShareAccess -Name writing-system
icacls E:\writing-system
Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Lsa' | Select-Object forceguest
```
