using System;
using System.IO;
using System.Collections.Generic;
using MelonLoader;
using Mono.Cecil;

[assembly: MelonInfo(typeof(OddRealmModPatchPlugin.PatchPlugin), "Odd Realm Mod Patch Plugin", "1.0.0", "TinyBeast")]
[assembly: MelonGame("Unknown Origin Games", "OddRealm")]

namespace OddRealmModPatchPlugin
{
    public class PatchPlugin : MelonPlugin
    {
        public override void OnPreSupportModule()
        {
            LoggerInstance.Msg("ModPatchPlugin checking for Unity 6 duplicate type bug...");
            try
            {
                string gameDir = AppDomain.CurrentDomain.BaseDirectory;
                string coreModulePath = Path.Combine(gameDir, "MelonLoader", "Il2CppAssemblies", "UnityEngine.CoreModule.dll");

                if (File.Exists(coreModulePath))
                {
                    if (HasDuplicateTypes(coreModulePath))
                    {
                        LoggerInstance.Warning("Detected corrupted UnityEngine.CoreModule.dll (duplicate <>O types). Patching...");
                        PatchCoreModule(coreModulePath);
                        LoggerInstance.Msg("UnityEngine.CoreModule.dll patched successfully!");
                    }
                    else
                    {
                        LoggerInstance.Msg("UnityEngine.CoreModule.dll is clean. No patch needed.");
                    }
                }
                else
                {
                    LoggerInstance.Msg("UnityEngine.CoreModule.dll not found yet. It will be generated on boot, and patched on the next launch.");
                }
            }
            catch (Exception ex)
            {
                LoggerInstance.Error($"Failed to check or patch UnityEngine.CoreModule.dll: {ex}");
            }
        }

        private bool HasDuplicateTypes(string path)
        {
            try
            {
                using (var assembly = AssemblyDefinition.ReadAssembly(path))
                {
                    foreach (var type in assembly.MainModule.Types)
                    {
                        if (type.Name == "<>O")
                        {
                            return true;
                        }
                    }
                }
            }
            catch {}
            return false;
        }

        private void PatchCoreModule(string path)
        {
            string backupPath = path + ".bak";
            if (!File.Exists(backupPath))
            {
                File.Copy(path, backupPath, true);
            }

            AssemblyDefinition assembly;
            using (var stream = File.OpenRead(path))
            {
                assembly = AssemblyDefinition.ReadAssembly(stream);
            }

            var typesToRemove = new List<TypeDefinition>();
            var seen = new HashSet<string>();

            foreach (var type in assembly.MainModule.Types)
            {
                if (type.Name == "<>O")
                {
                    if (seen.Contains(type.FullName))
                    {
                        typesToRemove.Add(type);
                    }
                    else
                    {
                        seen.Add(type.FullName);
                    }
                }
            }

            if (typesToRemove.Count > 0)
            {
                foreach (var type in typesToRemove)
                {
                    assembly.MainModule.Types.Remove(type);
                }
                assembly.Write(path);
            }
        }
    }
}
