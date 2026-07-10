using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using MelonLoader;
using UnityEngine;
using Newtonsoft.Json;

[assembly: MelonInfo(typeof(OddRealmModLoader.ModLoader), "Odd Realm Mod Loader", "1.0.0", "TinyBeast")]
[assembly: MelonGame("Unknown Origin Games", "OddRealm")]

namespace OddRealmModLoader
{
    public class ModLoader : MelonMod
    {
        public static ModLoader Instance { get; private set; } = null;
        public static string ModsDirectory => Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            "AppData", "LocalLow", "Unknown Origin Games", "OddRealm", "Mods"
        );

        public override void OnInitializeMelon()
        {
            Instance = this;
            LoggerInstance.Msg("Odd Realm Mod Loader v1.0.0 initializing (Fully Decoupled Edition)...");
            LogEnvironmentInfo();
        }

        public override void OnSceneWasInitialized(int buildIndex, string sceneName)
        {
            LoggerInstance.Msg($"Scene initialized: {sceneName} ({buildIndex})");
            InvokeInjector();
        }

        public override void OnUpdate()
        {
            InvokeInjector();
        }

        private void InvokeInjector()
        {
            try
            {
                // Dynamic invocation via reflection to completely isolate the JIT type-loader 
                // from loading the ModInjector class during early startup.
                var injectorType = typeof(ModLoader).Assembly.GetType("OddRealmModLoader.ModInjector");
                if (injectorType != null)
                {
                    var method = injectorType.GetMethod("TryInject", BindingFlags.Public | BindingFlags.Static);
                    if (method != null)
                    {
                        method.Invoke(null, new object[] { LoggerInstance });
                    }
                }
            }
            catch (Exception ex)
            {
                LoggerInstance.Error($"Dynamic injection invocation failed: {ex}");
            }
        }

        private void LogEnvironmentInfo()
        {
            try
            {
                string gameDir = AppDomain.CurrentDomain.BaseDirectory;
                string asmPath = Path.Combine(gameDir, "MelonLoader", "Il2CppAssemblies", "Assembly-CSharp.dll");

                LoggerInstance.Msg($"Game directory: {gameDir}");

                if (File.Exists(asmPath))
                {
                    var fileInfo = new FileInfo(asmPath);
                    LoggerInstance.Msg($"Assembly-CSharp.dll: {fileInfo.Length} bytes, modified {fileInfo.LastWriteTime:yyyy-MM-dd HH:mm:ss}");
                }
                else
                {
                    LoggerInstance.Warning("Assembly-CSharp.dll not found at expected Il2CppAssemblies path!");
                }
            }
            catch (Exception ex)
            {
                LoggerInstance.Warning($"Could not log environment info: {ex.Message}");
            }
        }
    }

    public static class ModInjector
    {
        private static bool _customModsInjected = false;
        private static Assembly _assemblyCSharp = null;

        // Cached Reflection Types
        private static Type _dataManagerType = null;
        private static Type _scriptableType = null;
        private static Type _iTagObjectType = null;
        private static Type _gdeTooltipsDataType = null;
        private static Type _gdeBlockVisualsDataType = null;
        private static Type _gdeItemsDataType = null;
        private static Type _gdeBlocksDataType = null;
        private static Type _gdeBlueprintsDataType = null;
        private static Type _itemActionType = null;
        private static Type _jobActionRequirementType = null;
        private static Type _jobActionTypesEnum = null;
        private static Type _workPositionTypesEnum = null;

        private static MethodInfo _addTagObjectMethod = null;

        public static void TryInject(MelonLogger.Instance logger)
        {
            if (_customModsInjected) return;

            try
            {
                // Resolve Assembly-CSharp dynamically
                if (_assemblyCSharp == null)
                {
                    _assemblyCSharp = AppDomain.CurrentDomain.GetAssemblies().FirstOrDefault(a => a.GetName().Name == "Assembly-CSharp");
                }

                if (_assemblyCSharp == null) return; // Wait until loaded

                // Resolve DataManager type and Instance
                if (_dataManagerType == null)
                {
                    _dataManagerType = _assemblyCSharp.GetType("Il2Cpp.DataManager");
                }
                if (_dataManagerType == null) return;

                var instanceProp = _dataManagerType.GetProperty("Instance", BindingFlags.Public | BindingFlags.Static);
                if (instanceProp == null) return;

                var dmInstance = instanceProp.GetValue(null);
                if (dmInstance == null) return;

                var allLoadedScriptsProp = _dataManagerType.GetProperty("AllLoadedScripts", BindingFlags.Public | BindingFlags.Instance);
                if (allLoadedScriptsProp == null) return;

                var allLoadedScripts = allLoadedScriptsProp.GetValue(dmInstance);
                if (allLoadedScripts == null) return;

                // Check if the script list has been populated yet by the game
                var countProp = allLoadedScripts.GetType().GetProperty("Count");
                int count = (int)countProp.GetValue(allLoadedScripts);
                if (count == 0) return;

                logger.Msg("DataManager is fully initialized. Injecting custom mods dynamically...");

                // Resolve rest of the types
                _scriptableType = _assemblyCSharp.GetType("Il2Cpp.Scriptable");
                _iTagObjectType = _assemblyCSharp.GetType("Il2Cpp.ITagObject");
                _gdeTooltipsDataType = _assemblyCSharp.GetType("Il2Cpp.GDETooltipsData");
                _gdeBlockVisualsDataType = _assemblyCSharp.GetType("Il2Cpp.GDEBlockVisualsData");
                _gdeItemsDataType = _assemblyCSharp.GetType("Il2Cpp.GDEItemsData");
                _gdeBlocksDataType = _assemblyCSharp.GetType("Il2Cpp.GDEBlocksData");
                _gdeBlueprintsDataType = _assemblyCSharp.GetType("Il2Cpp.GDEBlueprintsData");
                _itemActionType = _assemblyCSharp.GetType("Il2Cpp.ItemAction");
                _jobActionRequirementType = _assemblyCSharp.GetType("Il2Cpp.JobActionRequirement");
                _jobActionTypesEnum = _assemblyCSharp.GetType("Il2Cpp.JobActionTypes");
                _workPositionTypesEnum = _assemblyCSharp.GetType("Il2Cpp.WorkPositionTypes");

                _addTagObjectMethod = _dataManagerType.GetMethod("AddTagObject",
                    BindingFlags.NonPublic | BindingFlags.Instance,
                    null,
                    new[] { _iTagObjectType },
                    null);

                if (_addTagObjectMethod == null)
                {
                    logger.Error("Could not find private AddTagObject(ITagObject) method on DataManager!");
                    _customModsInjected = true;
                    return;
                }

                LoadCustomMods(dmInstance, allLoadedScripts, logger);
                _customModsInjected = true;
                logger.Msg("Mod injection completed successfully!");
            }
            catch (Exception ex)
            {
                logger.Error($"Error during custom mod injection: {ex}");
                _customModsInjected = true; // Prevent infinite loop on failure
            }
        }

        private static void SetProp(object obj, Type type, string propName, object value)
        {
            var prop = type.GetProperty(propName);
            if (prop != null)
            {
                prop.SetValue(obj, value);
            }
        }

        private static void SetField(object obj, Type type, string fieldName, object value)
        {
            var field = type.GetField(fieldName);
            if (field != null)
            {
                field.SetValue(obj, value);
            }
        }

        private static void RegisterScriptable(object scriptable, object dataManager, object allLoadedScripts, MelonLogger.Instance logger)
        {
            if (scriptable == null) return;
            try
            {
                // Add to AllLoadedScripts
                allLoadedScripts.GetType().GetMethod("Add").Invoke(allLoadedScripts, new object[] { scriptable });
                // Add to DataManager dictionaries via AddTagObject
                _addTagObjectMethod.Invoke(dataManager, new object[] { scriptable });
            }
            catch (Exception ex)
            {
                logger.Error($"Failed to register scriptable: {ex.Message}");
            }
        }

        private static void LoadCustomMods(object dataManager, object allLoadedScripts, MelonLogger.Instance logger)
        {
            if (!Directory.Exists(ModLoader.ModsDirectory))
            {
                logger.Msg($"Mods directory not found: {ModLoader.ModsDirectory}");
                return;
            }

            foreach (var modDir in Directory.GetDirectories(ModLoader.ModsDirectory))
            {
                string configPath = Path.Combine(modDir, "mod.json");
                if (!File.Exists(configPath)) continue;

                try
                {
                    logger.Msg($"Loading mod configuration from: {configPath}");
                    string jsonContent = File.ReadAllText(configPath);
                    ClientModConfig config = JsonConvert.DeserializeObject<ClientModConfig>(jsonContent);

                    if (config == null || string.IsNullOrEmpty(config.modId))
                    {
                        logger.Error($"Failed to parse mod.json or modId is missing in {modDir}");
                        continue;
                    }

                    logger.Msg($"Parsing custom mod: {config.modId}");

                    // 1. Load custom PNG sprites
                    LoadModSprites(modDir, logger);

                    // 2. Build Items
                    if (config.items != null)
                    {
                        foreach (var item in config.items)
                        {
                            if (string.IsNullOrEmpty(item.id)) continue;
                            BuildItem(item, dataManager, allLoadedScripts, logger);
                        }
                    }

                    // 3. Build Props
                    if (config.props != null)
                    {
                        foreach (var prop in config.props)
                        {
                            if (string.IsNullOrEmpty(prop.id)) continue;
                            BuildProp(prop, dataManager, allLoadedScripts, logger);
                        }
                    }

                    logger.Msg($"Successfully loaded mod: {config.modId}");
                }
                catch (Exception ex)
                {
                    logger.Error($"Error loading mod from {modDir}: {ex}");
                }
            }
        }

        private static void LoadModSprites(string modDir, MelonLogger.Instance logger)
        {
            string spritesDir = Path.Combine(modDir, "Sprites");
            if (!Directory.Exists(spritesDir)) return;

            foreach (var file in Directory.GetFiles(spritesDir, "*.png"))
            {
                try
                {
                    string spriteName = Path.GetFileNameWithoutExtension(file);
                    byte[] data = File.ReadAllBytes(file);
                    Texture2D texture = new Texture2D(2, 2, TextureFormat.RGBA32, false);
                    if (ImageConversion.LoadImage(texture, data))
                    {
                        texture.filterMode = FilterMode.Point;
                        Sprite sprite = Sprite.Create(texture, new Rect(0.0f, 0.0f, texture.width, texture.height), new Vector2(0.5f, 0.5f), 32.0f);
                        sprite.name = spriteName;

                        // Add to GlobalSettingsManager icon registry
                        var masterType = _assemblyCSharp.GetType("Il2Cpp.Master");
                        if (masterType != null)
                        {
                            var masterInstance = masterType.GetProperty("Instance").GetValue(null);
                            if (masterInstance != null)
                            {
                                var gsm = masterType.GetProperty("GlobalSettingsManager").GetValue(masterInstance);
                                if (gsm != null)
                                {
                                    gsm.GetType().GetMethod("AddSprite").Invoke(gsm, new object[] { sprite });
                                    logger.Msg($"Registered sprite: {spriteName} ({texture.width}x{texture.height})");
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    logger.Error($"Failed to load sprite {file}: {ex}");
                }
            }
        }

        private static void BuildItem(ClientItemConfig item, object dataManager, object allLoadedScripts, MelonLogger.Instance logger)
        {
            // Create Tooltip
            string tooltipKey = "";
            if (item.tooltip != null && !string.IsNullOrEmpty(item.tooltip.id))
            {
                tooltipKey = item.tooltip.id;
                var tooltipData = ScriptableObject.CreateInstance(Il2CppInterop.Runtime.Il2CppType.From(_gdeTooltipsDataType));
                SetProp(tooltipData, _scriptableType, "name", tooltipKey);
                SetProp(tooltipData, _gdeTooltipsDataType, "Name", item.tooltip.name);
                SetProp(tooltipData, _gdeTooltipsDataType, "NamePlural", item.tooltip.namePlural);
                SetProp(tooltipData, _gdeTooltipsDataType, "InlineIcon", item.tooltip.inlineIcon);

                if (!string.IsNullOrEmpty(item.tooltip.iconSpritePath))
                {
                    string spriteFilename = Path.GetFileNameWithoutExtension(item.tooltip.iconSpritePath);
                    SetProp(tooltipData, _gdeTooltipsDataType, "Icon", spriteFilename);
                }

                _gdeTooltipsDataType.GetMethod("Init").Invoke(tooltipData, null);
                RegisterScriptable(tooltipData, dataManager, allLoadedScripts, logger);
            }

            // Create Visuals
            string visualsKey = "";
            if (item.visuals != null && !string.IsNullOrEmpty(item.visuals.id))
            {
                visualsKey = item.visuals.id;
                var visualsData = ScriptableObject.CreateInstance(Il2CppInterop.Runtime.Il2CppType.From(_gdeBlockVisualsDataType));
                SetProp(visualsData, _scriptableType, "name", visualsKey);
                SetProp(visualsData, _gdeBlockVisualsDataType, "TextureX", item.visuals.textureX);
                SetProp(visualsData, _gdeBlockVisualsDataType, "TextureY", item.visuals.textureY);
                SetProp(visualsData, _gdeBlockVisualsDataType, "SecondaryTextureX", 0);
                SetProp(visualsData, _gdeBlockVisualsDataType, "SecondaryTextureY", 0);

                _gdeBlockVisualsDataType.GetMethod("Init").Invoke(visualsData, null);
                RegisterScriptable(visualsData, dataManager, allLoadedScripts, logger);
            }

            // Create Item
            var itemData = ScriptableObject.CreateInstance(Il2CppInterop.Runtime.Il2CppType.From(_gdeItemsDataType));
            SetProp(itemData, _scriptableType, "name", item.id);
            SetProp(itemData, _gdeItemsDataType, "BaseSkillLevel", item.baseSkillLevel);
            SetProp(itemData, _gdeItemsDataType, "MaxLifeTime", item.maxLifeTime);
            SetProp(itemData, _gdeItemsDataType, "MerchantBuyValue", item.merchantBuyValue);
            SetProp(itemData, _gdeItemsDataType, "ItemRarity", string.IsNullOrEmpty(item.itemRarity) ? "item_rarity_common" : item.itemRarity);
            SetProp(itemData, _gdeItemsDataType, "StackSize", item.stackSize > 0 ? item.stackSize : 1);
            SetProp(itemData, _gdeItemsDataType, "PermittedSlots", item.permittedSlots ?? Array.Empty<string>());
            SetProp(itemData, _gdeItemsDataType, "ItemType", string.IsNullOrEmpty(item.itemType) ? "tag_item_type_tool" : item.itemType);
            SetProp(itemData, _gdeItemsDataType, "TooltipID", tooltipKey);
            SetProp(itemData, _gdeItemsDataType, "Visuals", visualsKey);

            // Set required skill as a usage tag if specified
            if (!string.IsNullOrEmpty(item.requiredSkill))
            {
                SetProp(itemData, _gdeItemsDataType, "UsageTags", new string[] { item.requiredSkill });
            }

            // Actions
            if (item.actions != null && item.actions.Length > 0)
            {
                var actionsListType = typeof(List<>).MakeGenericType(_itemActionType);
                var actionsList = Activator.CreateInstance(actionsListType);

                foreach (var act in item.actions)
                {
                    var action = Activator.CreateInstance(_itemActionType);
                    SetField(action, _itemActionType, "ActionID", act.ActionID);
                    SetField(action, _itemActionType, "Status", act.Status);
                    SetField(action, _itemActionType, "SpawnID", act.SpawnID);
                    actionsListType.GetMethod("Add").Invoke(actionsList, new object[] { action });
                }

                var array = actionsListType.GetMethod("ToArray").Invoke(actionsList, null);
                var refArrayType = typeof(Il2CppInterop.Runtime.InteropTypes.Arrays.Il2CppReferenceArray<>).MakeGenericType(_itemActionType);
                var refArray = Activator.CreateInstance(refArrayType, new object[] { array });
                SetProp(itemData, _gdeItemsDataType, "Actions", refArray);
            }

            _gdeItemsDataType.GetMethod("Init").Invoke(itemData, null);
            RegisterScriptable(itemData, dataManager, allLoadedScripts, logger);
            logger.Msg($"Registered Item: {item.id}");
        }

        private static void BuildProp(ClientPropConfig prop, object dataManager, object allLoadedScripts, MelonLogger.Instance logger)
        {
            // Create Tooltip
            string tooltipKey = "";
            if (prop.tooltip != null && !string.IsNullOrEmpty(prop.tooltip.id))
            {
                tooltipKey = prop.tooltip.id;
                var tooltipData = ScriptableObject.CreateInstance(Il2CppInterop.Runtime.Il2CppType.From(_gdeTooltipsDataType));
                SetProp(tooltipData, _scriptableType, "name", tooltipKey);
                SetProp(tooltipData, _gdeTooltipsDataType, "Name", prop.tooltip.name);
                SetProp(tooltipData, _gdeTooltipsDataType, "NamePlural", prop.tooltip.namePlural);
                SetProp(tooltipData, _gdeTooltipsDataType, "InlineIcon", prop.tooltip.inlineIcon);

                if (!string.IsNullOrEmpty(prop.tooltip.iconSpritePath))
                {
                    string spriteFilename = Path.GetFileNameWithoutExtension(prop.tooltip.iconSpritePath);
                    SetProp(tooltipData, _gdeTooltipsDataType, "Icon", spriteFilename);
                }

                _gdeTooltipsDataType.GetMethod("Init").Invoke(tooltipData, null);
                RegisterScriptable(tooltipData, dataManager, allLoadedScripts, logger);
            }

            // Create Visuals
            var stringListType = typeof(List<string>);
            var visualsKeys = Activator.CreateInstance(stringListType);

            if (prop.visuals != null)
            {
                foreach (var vis in prop.visuals)
                {
                    if (vis == null || string.IsNullOrEmpty(vis.id)) continue;

                    var visualsData = ScriptableObject.CreateInstance(Il2CppInterop.Runtime.Il2CppType.From(_gdeBlockVisualsDataType));
                    SetProp(visualsData, _scriptableType, "name", vis.id);
                    SetProp(visualsData, _gdeBlockVisualsDataType, "TextureX", vis.textureX);
                    SetProp(visualsData, _gdeBlockVisualsDataType, "TextureY", vis.textureY);
                    SetProp(visualsData, _gdeBlockVisualsDataType, "SecondaryTextureX", 0);
                    SetProp(visualsData, _gdeBlockVisualsDataType, "SecondaryTextureY", 0);

                    _gdeBlockVisualsDataType.GetMethod("Init").Invoke(visualsData, null);
                    RegisterScriptable(visualsData, dataManager, allLoadedScripts, logger);
                    stringListType.GetMethod("Add").Invoke(visualsKeys, new object[] { vis.id });
                }
            }

            // Il2CppSystem.Collections.Generic.List<string> wrapper
            var il2CppStringListType = typeof(Il2CppSystem.Collections.Generic.List<string>);
            var il2CppVisualsKeys = Activator.CreateInstance(il2CppStringListType);
            var standardVisualsKeysArray = (string[])stringListType.GetMethod("ToArray").Invoke(visualsKeys, null);
            foreach (var key in standardVisualsKeysArray)
            {
                il2CppStringListType.GetMethod("Add").Invoke(il2CppVisualsKeys, new object[] { key });
            }

            // Create Block/Prop Object
            var blockData = ScriptableObject.CreateInstance(Il2CppInterop.Runtime.Il2CppType.From(_gdeBlocksDataType));
            SetProp(blockData, _scriptableType, "name", prop.id);
            SetProp(blockData, _gdeBlocksDataType, "RoomQualityAdd", prop.roomQualityAdd);
            SetProp(blockData, _gdeBlocksDataType, "Toughness", prop.toughness);
            SetProp(blockData, _gdeBlocksDataType, "IsObstruction", prop.isObstruction);
            SetProp(blockData, _gdeBlocksDataType, "IsVerticalAccess", prop.isVerticalAccess);
            SetProp(blockData, _gdeBlocksDataType, "MovementCost", prop.movementCost > 0 ? prop.movementCost : 3);
            SetProp(blockData, _gdeBlocksDataType, "TooltipID", tooltipKey);
            SetProp(blockData, _gdeBlocksDataType, "Visuals", il2CppVisualsKeys);

            _gdeBlocksDataType.GetMethod("Init").Invoke(blockData, null);
            RegisterScriptable(blockData, dataManager, allLoadedScripts, logger);

            // Create Blueprint for construction
            string blueprintId = "blueprint_" + prop.id;
            var blueprintData = ScriptableObject.CreateInstance(Il2CppInterop.Runtime.Il2CppType.From(_gdeBlueprintsDataType));
            SetProp(blueprintData, _scriptableType, "name", blueprintId);
            SetProp(blueprintData, _gdeBlueprintsDataType, "CategoryID", string.IsNullOrEmpty(prop.category) ? "blueprint_category_furniture" : prop.category);
            
            if (!string.IsNullOrEmpty(prop.research))
            {
                SetProp(blueprintData, _gdeBlueprintsDataType, "ResearchKeys", new string[] { prop.research });
            }
            else
            {
                SetProp(blueprintData, _gdeBlueprintsDataType, "ResearchKeys", Array.Empty<string>());
            }

            SetProp(blueprintData, _gdeBlueprintsDataType, "SpawnTagObjectID", prop.id);
            SetProp(blueprintData, _gdeBlueprintsDataType, "SpawnCount", 1);
            SetProp(blueprintData, _gdeBlueprintsDataType, "Visuals", il2CppVisualsKeys);

            // Blueprint Tooltip
            string blueprintTooltipKey = "tooltip_" + blueprintId;
            var blueprintTooltipData = ScriptableObject.CreateInstance(Il2CppInterop.Runtime.Il2CppType.From(_gdeTooltipsDataType));
            SetProp(blueprintTooltipData, _scriptableType, "name", blueprintTooltipKey);
            SetProp(blueprintTooltipData, _gdeTooltipsDataType, "Name", "Build " + (prop.tooltip != null ? prop.tooltip.name : "Custom Prop"));
            SetProp(blueprintTooltipData, _gdeTooltipsDataType, "Type", "Job");
            SetProp(blueprintTooltipData, _gdeTooltipsDataType, "TextColor", new Color(0f, 0.565f, 0.969f, 1f)); // Blue
            SetProp(blueprintTooltipData, _gdeTooltipsDataType, "VisibleToPlayer", true);

            if (prop.tooltip != null && !string.IsNullOrEmpty(prop.tooltip.iconSpritePath))
            {
                string spriteFilename = Path.GetFileNameWithoutExtension(prop.tooltip.iconSpritePath);
                SetProp(blueprintTooltipData, _gdeTooltipsDataType, "Icon", spriteFilename);
            }

            _gdeTooltipsDataType.GetMethod("Init").Invoke(blueprintTooltipData, null);
            RegisterScriptable(blueprintTooltipData, dataManager, allLoadedScripts, logger);

            SetProp(blueprintData, _gdeBlueprintsDataType, "TooltipID", blueprintTooltipKey);

            // Worker Skill
            string propWorkerSkill = "skill_craft_wood"; // Default
            if (prop.ingredients != null && prop.ingredients.Length > 0)
            {
                foreach (var ing in prop.ingredients)
                {
                    if (ing != null && !string.IsNullOrEmpty(ing.resource))
                    {
                        string resLower = ing.resource.ToLower();
                        if (resLower.Contains("stone") || resLower.Contains("brick"))
                        {
                            propWorkerSkill = "skill_craft_stone";
                            break;
                        }
                        else if (resLower.Contains("ingot") || resLower.Contains("metal") || resLower.Contains("iron") || resLower.Contains("bronze") || resLower.Contains("steel"))
                        {
                            propWorkerSkill = "skill_craft_metal";
                            break;
                        }
                        else if (resLower.Contains("leather"))
                        {
                            propWorkerSkill = "skill_craft_leather";
                            break;
                        }
                        else if (resLower.Contains("cloth") || resLower.Contains("fabric") || resLower.Contains("wool") || resLower.Contains("cotton"))
                        {
                            propWorkerSkill = "skill_craft_cloth";
                            break;
                        }
                    }
                }
            }
            SetProp(blueprintData, _gdeBlueprintsDataType, "WorkerID0", propWorkerSkill);
            SetProp(blueprintData, _gdeBlueprintsDataType, "BaseSkillLevel", 0);

            // Job Actions Requirements
            var actionsListType = typeof(List<>).MakeGenericType(_jobActionRequirementType);
            var actionsList = Activator.CreateInstance(actionsListType);

            // Enum Parsed values
            var collectEnum = Enum.Parse(_jobActionTypesEnum, "COLLECT");
            var workEnum = Enum.Parse(_jobActionTypesEnum, "WORK");
            var closestEnum = Enum.Parse(_workPositionTypesEnum, "CLOSEST");

            Action<object, string, object> addJobRequirement = (actionType, resourceId, workPos) =>
            {
                var req = Activator.CreateInstance(_jobActionRequirementType);
                SetProp(req, _jobActionRequirementType, "ActionType", actionType);
                if (resourceId != null) SetProp(req, _jobActionRequirementType, "ResourceID", resourceId);
                SetProp(req, _jobActionRequirementType, "WorkPosition", workPos);
                actionsListType.GetMethod("Add").Invoke(actionsList, new object[] { req });
            };

            if (prop.ingredients != null && prop.ingredients.Length > 0)
            {
                foreach (var ing in prop.ingredients)
                {
                    if (ing == null || string.IsNullOrEmpty(ing.resource)) continue;
                    int count = ing.count > 0 ? ing.count : 1;
                    for (int i = 0; i < count; i++)
                    {
                        addJobRequirement(collectEnum, ing.resource, closestEnum);
                    }
                }
            }
            else if (!string.IsNullOrEmpty(prop.requiredResource))
            {
                int count = prop.requiredResourceCount > 0 ? prop.requiredResourceCount : 1;
                for (int i = 0; i < count; i++)
                {
                    addJobRequirement(collectEnum, prop.requiredResource, closestEnum);
                }
            }

            // Always add a WORK action requirement at the end to actually build the prop
            addJobRequirement(workEnum, null, closestEnum);

            var reqArray = actionsListType.GetMethod("ToArray").Invoke(actionsList, null);
            var refReqArrayType = typeof(Il2CppInterop.Runtime.InteropTypes.Arrays.Il2CppReferenceArray<>).MakeGenericType(_jobActionRequirementType);
            var refReqArray = Activator.CreateInstance(refReqArrayType, new object[] { reqArray });
            SetProp(blueprintData, _gdeBlueprintsDataType, "JobActions", refReqArray);

            _gdeBlueprintsDataType.GetMethod("Init").Invoke(blueprintData, null);
            RegisterScriptable(blueprintData, dataManager, allLoadedScripts, logger);
            logger.Msg($"Registered Prop: {prop.id}");
        }
    }

    #region Client Mod Configuration Classes
    [Serializable]
    public class ClientItemAction
    {
        public string ActionID = "";
        public string Status = "";
        public string SpawnID = "";
    }

    [Serializable]
    public class ClientTooltipConfig
    {
        public string id = "";
        public string name = "";
        public string namePlural = "";
        public string inlineIcon = "";
        public string iconSpritePath = "";
    }

    [Serializable]
    public class ClientVisualsConfig
    {
        public string id = "";
        public int textureX;
        public int textureY;
        public int secondaryTextureX;
        public int secondaryTextureY;
    }

    [Serializable]
    public class ClientIngredientConfig
    {
        public string resource = "";
        public int count;
    }

    [Serializable]
    public class ClientItemConfig
    {
        public string id = "";
        public string itemType = "";
        public string requiredSkill = "";
        public int baseSkillLevel;
        public int maxLifeTime;
        public int merchantBuyValue;
        public string itemRarity = "";
        public int stackSize;
        public string[] permittedSlots;
        public ClientTooltipConfig tooltip;
        public ClientVisualsConfig visuals;
        public ClientItemAction[] actions;
    }

    [Serializable]
    public class ClientPropConfig
    {
        public string id = "";
        public string name = "";
        public string namePlural = "";
        public string category = "";
        public string research = "";
        public int roomQualityAdd;
        public int toughness;
        public bool isObstruction;
        public bool isVerticalAccess;
        public int movementCost;
        public string requiredResource = "";
        public int requiredResourceCount;
        public ClientIngredientConfig[] ingredients;
        public ClientTooltipConfig tooltip;
        public ClientVisualsConfig[] visuals;
    }

    [Serializable]
    public class ClientModConfig
    {
        public string modId = "";
        public ClientItemConfig[] items;
        public ClientPropConfig[] props;
    }
    #endregion
}
