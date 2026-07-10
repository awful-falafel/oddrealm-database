#if UNITY_EDITOR
using System;
using System.IO;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.AddressableAssets;
using UnityEditor.AddressableAssets.Settings;
using UnityEditor.AddressableAssets.Settings.GroupSchemas;
using UnityEngine;

[Serializable]
public class ClientItemAction
{
    public string ActionID;
    public string Status;
    public string SpawnID;
}

[Serializable]
public class ClientTooltipConfig
{
    public string id;
    public string name;
    public string namePlural;
    public string inlineIcon;
    public string iconSpritePath;
}

[Serializable]
public class ClientVisualsConfig
{
    public string id;
    public int textureX;
    public int textureY;
    public int secondaryTextureX;
    public int secondaryTextureY;
}

[Serializable]
public class ClientItemConfig
{
    public string id;
    public string itemType; 
    public string requiredSkill;
    public int baseSkillLevel;
    public int maxLifeTime;
    public int merchantBuyValue;
    public string itemRarity;
    public int stackSize;
    public string[] permittedSlots;
    public ClientTooltipConfig tooltip;
    public ClientVisualsConfig visuals;
    public ClientItemAction[] actions;
    // Recipe fields for crafting items
    public string category; 
    public string research; 
    public string locationId; 
    public ClientIngredientConfig[] ingredients;
}

[Serializable]
public class ClientIngredientConfig
{
    public string resource;
    public int count;
}

[Serializable]
public class ClientPropConfig
{
    public string id;
    public string name;
    public string namePlural;
    public string category; 
    public string research; 
    public int roomQualityAdd;
    public int toughness;
    public bool isObstruction;
    public bool isVerticalAccess;
    public int movementCost;
    public string requiredResource; 
    public int requiredResourceCount;
    public ClientIngredientConfig[] ingredients; // Multi-ingredient support!
    public ClientTooltipConfig tooltip;
    public ClientVisualsConfig[] visuals; // Multi-visual asset array!
}

[Serializable]
public class ClientModConfig
{
    public string modId;
    public ClientItemConfig[] items;
    public ClientPropConfig[] props;
}

public class ModBuilder
{
    [MenuItem("TinyBeast/Build Mod Headless")]
    public static void BuildMod()
    {
        Debug.Log("ModBuilder: Starting headless build...");
        try
        {
            // 1. Read JSON file
            string jsonPath = Path.Combine(Directory.GetCurrentDirectory(), "TempModConfig.json");
            if (!File.Exists(jsonPath))
            {
                Debug.LogError("ModBuilder Error: TempModConfig.json not found in " + Directory.GetCurrentDirectory());
                return;
            }

            string json = File.ReadAllText(jsonPath);
            ClientModConfig config = JsonUtility.FromJson<ClientModConfig>(json);
            if (config == null || string.IsNullOrEmpty(config.modId))
            {
                Debug.LogError("ModBuilder Error: Failed to parse TempModConfig.json or modId is empty.");
                return;
            }

            Debug.Log("ModBuilder: Parsing mod: " + config.modId);

            // Create target folders
            string modRoot = "Assets/Mods/" + config.modId;
            string dataDir = modRoot + "/Data";
            string itemsDir = dataDir + "/Items";
            string tooltipsDir = dataDir + "/Tooltips";
            string visualsDir = dataDir + "/Visuals";
            string blocksDir = dataDir + "/Blocks";
            string blueprintsDir = dataDir + "/Blueprints";

            EnsureDirectoryExists(itemsDir);
            EnsureDirectoryExists(tooltipsDir);
            EnsureDirectoryExists(visualsDir);
            EnsureDirectoryExists(blocksDir);
            EnsureDirectoryExists(blueprintsDir);

            AssetDatabase.Refresh();

            List<string> createdAssetPaths = new List<string>();

            // Configure texture import settings first
            ConfigureSprites(modRoot);

            // 2. Build Items
            if (config.items != null)
            {
                foreach (var item in config.items)
                {
                    if (string.IsNullOrEmpty(item.id)) continue;

                    // Create/Update Tooltip
                    string tooltipKey = "";
                    if (item.tooltip != null && !string.IsNullOrEmpty(item.tooltip.id))
                    {
                        tooltipKey = item.tooltip.id;
                        string tooltipAssetPath = tooltipsDir + "/" + tooltipKey + ".asset";
                        GDETooltipsData tooltipData = AssetDatabase.LoadAssetAtPath<GDETooltipsData>(tooltipAssetPath);
                        if (tooltipData == null)
                        {
                            tooltipData = ScriptableObject.CreateInstance<GDETooltipsData>();
                            AssetDatabase.CreateAsset(tooltipData, tooltipAssetPath);
                        }

                        tooltipData.Name = item.tooltip.name;
                        tooltipData.NamePlural = item.tooltip.namePlural;
                        tooltipData.InlineIcon = item.tooltip.inlineIcon;
                        
                        // Assign custom icon
                        if (!string.IsNullOrEmpty(item.tooltip.iconSpritePath))
                        {
                            string spriteFilename = Path.GetFileName(item.tooltip.iconSpritePath);
                            string spritePath = modRoot + "/Sprites/" + spriteFilename;
                            Sprite sprite = AssetDatabase.LoadAssetAtPath<Sprite>(spritePath);
                            if (sprite != null)
                            {
                                SetFieldReflectively(tooltipData, "Icon", spriteFilename.Replace(".png", ""));
                                SetFieldReflectively(tooltipData, "IconSprite", sprite); 
                            }
                        }

                        EditorUtility.SetDirty(tooltipData);
                        createdAssetPaths.Add(tooltipAssetPath);
                    }

                    // Create/Update Visuals
                    string visualsKey = "";
                    if (item.visuals != null && !string.IsNullOrEmpty(item.visuals.id))
                    {
                        visualsKey = item.visuals.id;
                        string visualsAssetPath = visualsDir + "/" + visualsKey + ".asset";
                        GDEBlockVisualsData visualsData = AssetDatabase.LoadAssetAtPath<GDEBlockVisualsData>(visualsAssetPath);
                        if (visualsData == null)
                        {
                            visualsData = ScriptableObject.CreateInstance<GDEBlockVisualsData>();
                            AssetDatabase.CreateAsset(visualsData, visualsAssetPath);
                        }

                        visualsData.TextureX = item.visuals.textureX;
                        visualsData.TextureY = item.visuals.textureY;
                        visualsData.SecondaryTextureX = 0;
                        visualsData.SecondaryTextureY = 0;

                        EditorUtility.SetDirty(visualsData);
                        createdAssetPaths.Add(visualsAssetPath);
                    }

                    // Create/Update Item
                    string itemAssetPath = itemsDir + "/" + item.id + ".asset";
                    GDEItemsData itemData = AssetDatabase.LoadAssetAtPath<GDEItemsData>(itemAssetPath);
                    if (itemData == null)
                    {
                        itemData = ScriptableObject.CreateInstance<GDEItemsData>();
                        AssetDatabase.CreateAsset(itemData, itemAssetPath);
                    }

                    itemData.BaseSkillLevel = item.baseSkillLevel;
                    itemData.MaxLifeTime = item.maxLifeTime;
                    itemData.MerchantBuyValue = item.merchantBuyValue;
                    itemData.ItemRarity = string.IsNullOrEmpty(item.itemRarity) ? "item_rarity_common" : item.itemRarity;
                    itemData.StackSize = item.stackSize > 0 ? item.stackSize : 1;
                    itemData.PermittedSlots = item.permittedSlots;
                    itemData.ItemType = string.IsNullOrEmpty(item.itemType) ? "tag_item_type_tool" : item.itemType;
                    itemData.TooltipID = tooltipKey;
                    itemData.Visuals = visualsKey;

                    // Add standard item tags
                    itemData.TagIDs = new List<string> { "tag_item", itemData.ItemRarity, itemData.ItemType };
                    if (itemData.PermittedSlots != null && itemData.PermittedSlots.Length > 0)
                    {
                        itemData.TagIDs.Add("tag_can_equip");
                        itemData.AddTag("tag_can_equip");
                    }

                    // Set required skill as a usage tag if specified
                    if (!string.IsNullOrEmpty(item.requiredSkill))
                    {
                        itemData.UsageTags = new string[] { item.requiredSkill };
                    }

                    // Actions
                    if (item.actions != null && item.actions.Length > 0)
                    {
                        List<ItemAction> actList = new List<ItemAction>();
                        foreach (var act in item.actions)
                        {
                            actList.Add(new ItemAction
                            {
                                ActionID = act.ActionID,
                                Status = act.Status,
                                SpawnID = act.SpawnID
                            });
                        }
                        itemData.Actions = actList.ToArray();
                    }

                    EditorUtility.SetDirty(itemData);
                    createdAssetPaths.Add(itemAssetPath);

                    // Create/Update Blueprint for item if it has ingredients configured
                    if (item.ingredients != null && item.ingredients.Length > 0)
                    {
                        string blueprintId = "blueprint_" + item.id;
                        string blueprintAssetPath = blueprintsDir + "/" + blueprintId + ".asset";
                        GDEBlueprintsData blueprintData = AssetDatabase.LoadAssetAtPath<GDEBlueprintsData>(blueprintAssetPath);
                        if (blueprintData == null)
                        {
                            blueprintData = ScriptableObject.CreateInstance<GDEBlueprintsData>();
                            AssetDatabase.CreateAsset(blueprintData, blueprintAssetPath);
                        }

                        blueprintData.CategoryID = string.IsNullOrEmpty(item.category) ? "blueprint_category_none" : item.category;
                        if (!string.IsNullOrEmpty(item.research))
                        {
                            blueprintData.ResearchKeys = new string[] { item.research };
                        }
                        else
                        {
                            blueprintData.ResearchKeys = Array.Empty<string>();
                        }

                        blueprintData.SpawnTagObjectID = item.id;
                        blueprintData.SpawnCount = 1;
                        blueprintData.Visuals = new List<string> { visualsKey };
                        
                        // Create/Update Blueprint Tooltip
                        string blueprintTooltipKey = "tooltip_" + blueprintId;
                        string blueprintTooltipAssetPath = tooltipsDir + "/" + blueprintTooltipKey + ".asset";
                        GDETooltipsData blueprintTooltipData = AssetDatabase.LoadAssetAtPath<GDETooltipsData>(blueprintTooltipAssetPath);
                        if (blueprintTooltipData == null)
                        {
                            blueprintTooltipData = ScriptableObject.CreateInstance<GDETooltipsData>();
                            AssetDatabase.CreateAsset(blueprintTooltipData, blueprintTooltipAssetPath);
                        }
                        blueprintTooltipData.Name = "Craft " + (item.tooltip != null ? item.tooltip.name : "Custom Item");
                        blueprintTooltipData.Type = "Job";
                        blueprintTooltipData.TextColor = new Color(0f, 0.565f, 0.969f, 1f); // Blue
                        blueprintTooltipData.VisibleToPlayer = true;
                        
                        if (item.tooltip != null && !string.IsNullOrEmpty(item.tooltip.iconSpritePath))
                        {
                            string spriteFilename = Path.GetFileName(item.tooltip.iconSpritePath);
                            string spritePath = modRoot + "/Sprites/" + spriteFilename;
                            Sprite sprite = AssetDatabase.LoadAssetAtPath<Sprite>(spritePath);
                            if (sprite != null)
                            {
                                SetFieldReflectively(blueprintTooltipData, "Icon", spriteFilename.Replace(".png", ""));
                                SetFieldReflectively(blueprintTooltipData, "IconSprite", sprite); 
                            }
                        }
                        EditorUtility.SetDirty(blueprintTooltipData);
                        createdAssetPaths.Add(blueprintTooltipAssetPath);

                        blueprintData.TooltipID = blueprintTooltipKey;
                        blueprintData.LocationID = string.IsNullOrEmpty(item.locationId) ? "" : item.locationId;

                        // Map LocationID to worker skill (crafting requirement)
                        string workerSkill = "skill_misc";
                        if (!string.IsNullOrEmpty(blueprintData.LocationID))
                        {
                            if (blueprintData.LocationID == "tag_anvil" || blueprintData.LocationID == "tag_furnace") {
                                workerSkill = "skill_craft_metal";
                            } else if (blueprintData.LocationID == "tag_stove" || blueprintData.LocationID == "tag_wood_stove" || blueprintData.LocationID == "tag_cauldron" || blueprintData.LocationID == "tag_still" || blueprintData.LocationID == "tag_butcher_block") {
                                workerSkill = "skill_cook";
                            } else if (blueprintData.LocationID == "tag_loom" || blueprintData.LocationID == "tag_tailor_bench") {
                                workerSkill = "skill_craft_cloth";
                            } else if (blueprintData.LocationID == "tag_masonry_bench") {
                                workerSkill = "skill_craft_stone";
                            } else if (blueprintData.LocationID == "tag_workbench" || blueprintData.LocationID == "tag_work_bench") {
                                workerSkill = "skill_craft_wood";
                            }
                        }
                        // Use item requiredSkill if specified and it's a crafting-related skill
                        if (!string.IsNullOrEmpty(item.requiredSkill) && item.requiredSkill.StartsWith("skill_craft_"))
                        {
                            workerSkill = item.requiredSkill;
                        }
                        blueprintData.WorkerID0 = workerSkill;
                        blueprintData.BaseSkillLevel = item.baseSkillLevel;


                        List<JobActionRequirement> jActions = new List<JobActionRequirement>();
                        foreach (var ing in item.ingredients)
                        {
                            if (!string.IsNullOrEmpty(ing.resource))
                            {
                                int count = ing.count > 0 ? ing.count : 1;
                                for (int i = 0; i < count; i++)
                                {
                                    jActions.Add(new JobActionRequirement
                                    {
                                        ActionType = JobActionTypes.COLLECT,
                                        ResourceID = ing.resource,
                                        WorkPosition = WorkPositionTypes.CLOSEST
                                    });
                                }
                            }
                        }
                        
                        jActions.Add(new JobActionRequirement
                        {
                            ActionType = JobActionTypes.WORK,
                            WorkPosition = WorkPositionTypes.CLOSEST
                        });
                        blueprintData.JobActions = jActions.ToArray();
                        blueprintData.TagIDs = new List<string> { "tag_blueprints" };

                        EditorUtility.SetDirty(blueprintData);
                        createdAssetPaths.Add(blueprintAssetPath);
                    }
                }
            }

            // 3. Build Props (blocks and blueprints)
            if (config.props != null)
            {
                foreach (var prop in config.props)
                {
                    if (string.IsNullOrEmpty(prop.id)) continue;

                    // Create/Update Tooltip
                    string tooltipKey = "";
                    if (prop.tooltip != null && !string.IsNullOrEmpty(prop.tooltip.id))
                    {
                        tooltipKey = prop.tooltip.id;
                        string tooltipAssetPath = tooltipsDir + "/" + tooltipKey + ".asset";
                        GDETooltipsData tooltipData = AssetDatabase.LoadAssetAtPath<GDETooltipsData>(tooltipAssetPath);
                        if (tooltipData == null)
                        {
                            tooltipData = ScriptableObject.CreateInstance<GDETooltipsData>();
                            AssetDatabase.CreateAsset(tooltipData, tooltipAssetPath);
                        }

                        tooltipData.Name = prop.tooltip.name;
                        tooltipData.NamePlural = prop.tooltip.namePlural;
                        tooltipData.InlineIcon = prop.tooltip.inlineIcon;
                        
                        // Assign custom icon
                        if (!string.IsNullOrEmpty(prop.tooltip.iconSpritePath))
                        {
                            string spriteFilename = Path.GetFileName(prop.tooltip.iconSpritePath);
                            string spritePath = modRoot + "/Sprites/" + spriteFilename;
                            Sprite sprite = AssetDatabase.LoadAssetAtPath<Sprite>(spritePath);
                            if (sprite != null)
                            {
                                SetFieldReflectively(tooltipData, "Icon", spriteFilename.Replace(".png", ""));
                                SetFieldReflectively(tooltipData, "IconSprite", sprite); 
                            }
                        }

                        EditorUtility.SetDirty(tooltipData);
                        createdAssetPaths.Add(tooltipAssetPath);
                    }

                    // Create/Update Visuals List
                    List<string> visualsKeys = new List<string>();
                    if (prop.visuals != null)
                    {
                        for (int idx = 0; idx < prop.visuals.Length; idx++)
                        {
                            var vis = prop.visuals[idx];
                            if (vis == null || string.IsNullOrEmpty(vis.id)) continue;

                            string visualsAssetPath = visualsDir + "/" + vis.id + ".asset";
                            GDEBlockVisualsData visualsData = AssetDatabase.LoadAssetAtPath<GDEBlockVisualsData>(visualsAssetPath);
                            if (visualsData == null)
                            {
                                visualsData = ScriptableObject.CreateInstance<GDEBlockVisualsData>();
                                AssetDatabase.CreateAsset(visualsData, visualsAssetPath);
                            }

                            visualsData.TextureX = vis.textureX;
                            visualsData.TextureY = vis.textureY;
                            visualsData.SecondaryTextureX = 0;
                            visualsData.SecondaryTextureY = 0;

                            EditorUtility.SetDirty(visualsData);
                            createdAssetPaths.Add(visualsAssetPath);
                            visualsKeys.Add(vis.id);
                        }
                    }

                    // Create/Update Block/Prop Object
                    string blockAssetPath = blocksDir + "/" + prop.id + ".asset";
                    GDEBlocksData blockData = AssetDatabase.LoadAssetAtPath<GDEBlocksData>(blockAssetPath);
                    if (blockData == null)
                    {
                        blockData = ScriptableObject.CreateInstance<GDEBlocksData>();
                        AssetDatabase.CreateAsset(blockData, blockAssetPath);
                    }

                    blockData.RoomQualityAdd = prop.roomQualityAdd;
                    blockData.Toughness = prop.toughness;
                    blockData.IsObstruction = prop.isObstruction;
                    blockData.IsVerticalAccess = prop.isVerticalAccess;
                    blockData.MovementCost = prop.movementCost > 0 ? prop.movementCost : 3;
                    blockData.TooltipID = tooltipKey;
                    blockData.Visuals = visualsKeys;
                    blockData.TagIDs = new List<string> { "tag_props", prop.id };

                    EditorUtility.SetDirty(blockData);
                    createdAssetPaths.Add(blockAssetPath);

                    // Create/Update Blueprint for construction
                    string blueprintId = "blueprint_" + prop.id;
                    string blueprintAssetPath = blueprintsDir + "/" + blueprintId + ".asset";
                    GDEBlueprintsData blueprintData = AssetDatabase.LoadAssetAtPath<GDEBlueprintsData>(blueprintAssetPath);
                    if (blueprintData == null)
                    {
                        blueprintData = ScriptableObject.CreateInstance<GDEBlueprintsData>();
                        AssetDatabase.CreateAsset(blueprintData, blueprintAssetPath);
                    }

                    blueprintData.CategoryID = string.IsNullOrEmpty(prop.category) ? "blueprint_category_furniture" : prop.category;
                    if (!string.IsNullOrEmpty(prop.research))
                    {
                        blueprintData.ResearchKeys = new string[] { prop.research };
                    }
                    else
                    {
                        blueprintData.ResearchKeys = Array.Empty<string>();
                    }

                    blueprintData.SpawnTagObjectID = prop.id;
                    blueprintData.SpawnCount = 1;
                    blueprintData.Visuals = visualsKeys;
                    
                    // Create/Update Blueprint Tooltip
                    string blueprintTooltipKey = "tooltip_" + blueprintId;
                    string blueprintTooltipAssetPath = tooltipsDir + "/" + blueprintTooltipKey + ".asset";
                    GDETooltipsData blueprintTooltipData = AssetDatabase.LoadAssetAtPath<GDETooltipsData>(blueprintTooltipAssetPath);
                    if (blueprintTooltipData == null)
                    {
                        blueprintTooltipData = ScriptableObject.CreateInstance<GDETooltipsData>();
                        AssetDatabase.CreateAsset(blueprintTooltipData, blueprintTooltipAssetPath);
                    }
                    blueprintTooltipData.Name = "Build " + (prop.tooltip != null ? prop.tooltip.name : "Custom Prop");
                    blueprintTooltipData.Type = "Job";
                    blueprintTooltipData.TextColor = new Color(0f, 0.565f, 0.969f, 1f); // Blue
                    blueprintTooltipData.VisibleToPlayer = true;
                    
                    if (prop.tooltip != null && !string.IsNullOrEmpty(prop.tooltip.iconSpritePath))
                    {
                        string spriteFilename = Path.GetFileName(prop.tooltip.iconSpritePath);
                        string spritePath = modRoot + "/Sprites/" + spriteFilename;
                        Sprite sprite = AssetDatabase.LoadAssetAtPath<Sprite>(spritePath);
                        if (sprite != null)
                        {
                            SetFieldReflectively(blueprintTooltipData, "Icon", spriteFilename.Replace(".png", ""));
                            SetFieldReflectively(blueprintTooltipData, "IconSprite", sprite); 
                        }
                    }
                    EditorUtility.SetDirty(blueprintTooltipData);
                    createdAssetPaths.Add(blueprintTooltipAssetPath);

                    blueprintData.TooltipID = blueprintTooltipKey;

                    // Determine construction worker skill dynamically based on ingredients
                    string propWorkerSkill = "skill_craft_wood"; // Default for furniture
                    if (prop.ingredients != null && prop.ingredients.Length > 0)
                    {
                        foreach (var ing in prop.ingredients)
                        {
                            if (!string.IsNullOrEmpty(ing.resource))
                            {
                                string resLower = ing.resource.ToLower();
                                if (resLower.Contains("stone") || resLower.Contains("brick")) {
                                    propWorkerSkill = "skill_craft_stone";
                                    break;
                                } else if (resLower.Contains("ingot") || resLower.Contains("metal") || resLower.Contains("iron") || resLower.Contains("bronze") || resLower.Contains("steel")) {
                                    propWorkerSkill = "skill_craft_metal";
                                    break;
                                } else if (resLower.Contains("leather")) {
                                    propWorkerSkill = "skill_craft_leather";
                                    break;
                                } else if (resLower.Contains("cloth") || resLower.Contains("fabric") || resLower.Contains("wool") || resLower.Contains("cotton")) {
                                    propWorkerSkill = "skill_craft_cloth";
                                    break;
                                }
                            }
                        }
                    }
                    blueprintData.WorkerID0 = propWorkerSkill;
                    blueprintData.BaseSkillLevel = 0; // Default to 0 for simple placement


                    // Build blueprint job actions based on required resource(s)
                    List<JobActionRequirement> actions = new List<JobActionRequirement>();
                    if (prop.ingredients != null && prop.ingredients.Length > 0)
                    {
                        foreach (var ing in prop.ingredients)
                        {
                            if (!string.IsNullOrEmpty(ing.resource))
                            {
                                int count = ing.count > 0 ? ing.count : 1;
                                for (int i = 0; i < count; i++)
                                {
                                    actions.Add(new JobActionRequirement
                                    {
                                        ActionType = JobActionTypes.COLLECT,
                                        ResourceID = ing.resource,
                                        WorkPosition = WorkPositionTypes.CLOSEST
                                    });
                                }
                            }
                        }
                    }
                    else if (!string.IsNullOrEmpty(prop.requiredResource))
                    {
                        // Fallback
                        int count = prop.requiredResourceCount > 0 ? prop.requiredResourceCount : 1;
                        for (int i = 0; i < count; i++)
                        {
                            actions.Add(new JobActionRequirement
                            {
                                ActionType = JobActionTypes.COLLECT,
                                ResourceID = prop.requiredResource,
                                WorkPosition = WorkPositionTypes.CLOSEST
                            });
                        }
                    }
                    
                    actions.Add(new JobActionRequirement
                    {
                        ActionType = JobActionTypes.WORK,
                        WorkPosition = WorkPositionTypes.CLOSEST
                    });
                    blueprintData.JobActions = actions.ToArray();
                    blueprintData.TagIDs = new List<string> { "tag_blueprints" };

                    EditorUtility.SetDirty(blueprintData);
                    createdAssetPaths.Add(blueprintAssetPath);
                }
            }

            AssetDatabase.SaveAssets();
            Debug.Log("ModBuilder: ScriptableObjects created successfully.");

            // 4. Configure Addressables
            var settings = AddressableAssetSettingsDefaultObject.Settings;
            if (settings == null)
            {
                Debug.LogError("ModBuilder Error: AddressableAssetSettings not found. Ensure Addressables is installed and initialized.");
                return;
            }

            // Enable Bundle Local Catalog so the catalog is generated in binary format (.bundle) as required by the game
            settings.BundleLocalCatalog = true;
            // Build remote catalog so the game can discover and load mod assets via the standalone catalog file.
            // With ENABLE_BINARY_CATALOG defined in ProjectSettings, this produces catalog.bin (binary) instead of catalog.json
            settings.BuildRemoteCatalog = true;

            // Create or configure the profile
            string profileName = config.modId;
            string profileId = settings.profileSettings.GetProfileId(profileName);
            if (string.IsNullOrEmpty(profileId))
            {
                profileId = settings.profileSettings.AddProfile(profileName, "Default");
                Debug.Log("ModBuilder: Created Addressables Profile: " + profileName);
            }

            settings.profileSettings.SetValue(profileId, "LocalBuildPath", "[UnityEngine.Application.persistentDataPath]/Mods/" + config.modId);
            settings.profileSettings.SetValue(profileId, "LocalLoadPath", "{UnityEngine.Application.persistentDataPath}/Mods/" + config.modId);
            // Remote catalog paths must also point to the mod directory so catalog.bin goes alongside the bundles
            settings.profileSettings.SetValue(profileId, "RemoteBuildPath", "[UnityEngine.Application.persistentDataPath]/Mods/" + config.modId);
            settings.profileSettings.SetValue(profileId, "RemoteLoadPath", "{UnityEngine.Application.persistentDataPath}/Mods/" + config.modId);
            settings.activeProfileId = profileId;
            Debug.Log("ModBuilder: Active profile set to: " + profileName);

            // Create or configure group
            AddressableAssetGroup group = settings.FindGroup(config.modId);
            if (group == null)
            {
                group = settings.CreateGroup(config.modId, false, false, false, null);
                Debug.Log("ModBuilder: Created Addressables Group: " + config.modId);
            }

            // Configure schemas
            var schema = group.GetSchema<BundledAssetGroupSchema>();
            if (schema == null)
            {
                schema = group.AddSchema<BundledAssetGroupSchema>();
            }
            schema.BundleMode = BundledAssetGroupSchema.BundlePackingMode.PackTogetherByLabel;
            // Use filename-based internal IDs so the catalog references assets by short name
            // (e.g., "item_custom_8102.asset") instead of full Unity paths 
            // (e.g., "Assets/Mods/ModID/Data/Items/item_custom_8102.asset").
            // This matches the format used by working Steam Workshop mods.
            schema.InternalIdNamingMode = BundledAssetGroupSchema.AssetNamingMode.Filename;
            schema.InternalBundleIdMode = BundledAssetGroupSchema.BundleInternalIdMode.GroupGuidProjectIdHash;
            schema.BundleNaming = BundledAssetGroupSchema.BundleNamingStyle.NoHash;

            // Clear old entries from group
            List<AddressableAssetEntry> entriesToRemove = new List<AddressableAssetEntry>(group.entries);
            foreach (var entry in entriesToRemove)
            {
                group.RemoveAssetEntry(entry);
            }

            // Register assets in group
            foreach (var path in createdAssetPaths)
            {
                string guid = AssetDatabase.AssetPathToGUID(path);
                AddressableAssetEntry entry = settings.CreateOrMoveEntry(guid, group);
                if (entry != null)
                {
                    entry.address = Path.GetFileNameWithoutExtension(path);
                    
                    // Add mod ID as a label (non-exclusive, so we keep both)
                    entry.SetLabel(config.modId, true, true);

                    // Add category label based on asset type folder so the game can query and load them
                    string normalizedPath = path.Replace("\\", "/");
                    if (normalizedPath.Contains("/Tooltips/"))
                    {
                        entry.SetLabel("tooltips", true, true);
                    }
                    else if (normalizedPath.Contains("/Visuals/") || normalizedPath.Contains("/BlockVisuals/"))
                    {
                        entry.SetLabel("blockvisuals", true, true);
                    }
                    else if (normalizedPath.Contains("/Items/"))
                    {
                        entry.SetLabel("items", true, true);
                    }
                    else if (normalizedPath.Contains("/Blueprints/"))
                    {
                        entry.SetLabel("blueprints", true, true);
                    }
                    else if (normalizedPath.Contains("/Blocks/"))
                    {
                        entry.SetLabel("blocks", true, true);
                    }
                }
            }

            // Sprites are loaded directly as raw files from the mod folder by the game, not registered in Addressables.


            EditorUtility.SetDirty(schema);
            EditorUtility.SetDirty(settings);
            AssetDatabase.SaveAssets();

            Debug.Log("ModBuilder: persistentDataPath is: " + Application.persistentDataPath);
            var buildPath = settings.profileSettings.GetValueByName(profileId, "LocalBuildPath");
            var remoteBuildPath = settings.profileSettings.GetValueByName(profileId, "RemoteBuildPath");
            Debug.Log("ModBuilder: LocalBuildPath raw: " + buildPath);
            Debug.Log("ModBuilder: RemoteBuildPath raw: " + remoteBuildPath);
            
            // Evaluate variables
            var localBuildPathEval = settings.profileSettings.EvaluateString(profileId, buildPath);
            var remoteBuildPathEval = settings.profileSettings.EvaluateString(profileId, remoteBuildPath);
            Debug.Log("ModBuilder: Evaluated LocalBuildPath: " + localBuildPathEval);
            Debug.Log("ModBuilder: Evaluated RemoteBuildPath: " + remoteBuildPathEval);

            Debug.Log("ModBuilder: Starting Addressables compilation build...");
            AddressableAssetSettings.BuildPlayerContent();

            // Post-build cleanup: ensure only the newest catalog file pair exists in the mod output folder
            if (Directory.Exists(localBuildPathEval))
            {
                string[] catalogs = Directory.GetFiles(localBuildPathEval, "catalog_*.bin");
                if (catalogs.Length > 1)
                {
                    System.Array.Sort(catalogs);
                    string newestCatalog = catalogs[catalogs.Length - 1];
                    foreach (var cat in catalogs)
                    {
                        if (cat != newestCatalog)
                        {
                            try
                            {
                                File.Delete(cat);
                                string hashFile = cat.Replace(".bin", ".hash");
                                if (File.Exists(hashFile))
                                {
                                    File.Delete(hashFile);
                                }
                                Debug.Log("ModBuilder: Deleted old catalog file: " + Path.GetFileName(cat));
                            }
                            catch (Exception) {}
                        }
                    }
                }
            }

            // Post-build copy: copy all raw PNG sprites to the mod folder root
            string spritesFolderPath = modRoot + "/Sprites";
            if (Directory.Exists(spritesFolderPath))
            {
                string[] sprites = Directory.GetFiles(spritesFolderPath, "*.png");
                foreach (var sPath in sprites)
                {
                    string filename = Path.GetFileName(sPath);
                    string destPath = Path.Combine(localBuildPathEval, filename);
                    try
                    {
                        File.Copy(sPath, destPath, true);
                        Debug.Log("ModBuilder: Copied raw sprite to mod folder root: " + filename);
                    }
                    catch (Exception ex)
                    {
                        Debug.LogError("ModBuilder: Failed to copy sprite " + filename + ": " + ex.Message);
                    }
                }
            }

            Debug.Log("ModBuilder: SUCCESS - Mod Build completed successfully!");
        }
        catch (Exception e)
        {
            Debug.LogError("ModBuilder Exception: " + e.ToString());
        }
    }

    [MenuItem("TinyBeast/Build Raw Assets Headless")]
    public static void BuildRawAssetsHeadless()
    {
        Debug.Log("ModBuilder: Starting raw assets headless build...");
        try
        {
            // 1. Read JSON file to get modId
            string jsonPath = Path.Combine(Directory.GetCurrentDirectory(), "TempModConfig.json");
            if (!File.Exists(jsonPath))
            {
                Debug.LogError("ModBuilder Error: TempModConfig.json not found in " + Directory.GetCurrentDirectory());
                return;
            }

            string json = File.ReadAllText(jsonPath);
            ClientModConfig config = JsonUtility.FromJson<ClientModConfig>(json);
            if (config == null || string.IsNullOrEmpty(config.modId))
            {
                Debug.LogError("ModBuilder Error: Failed to parse TempModConfig.json or modId is empty.");
                return;
            }

            Debug.Log("ModBuilder: Building raw assets for mod: " + config.modId);

            string modRoot = "Assets/Mods/" + config.modId;
            AssetDatabase.Refresh();

            List<string> createdAssetPaths = new List<string>();
            
            // Scan modRoot recursively for .asset files
            if (Directory.Exists(modRoot))
            {
                string[] files = Directory.GetFiles(modRoot, "*.asset", SearchOption.AllDirectories);
                foreach (var file in files)
                {
                    createdAssetPaths.Add(file.Replace("\\", "/"));
                }
            }

            Debug.Log("ModBuilder: Found " + createdAssetPaths.Count + " raw assets to register.");

            // Configure texture import settings first
            ConfigureSprites(modRoot);

            // 4. Configure Addressables
            var settings = AddressableAssetSettingsDefaultObject.Settings;
            if (settings == null)
            {
                Debug.LogError("ModBuilder Error: AddressableAssetSettings not found. Ensure Addressables is installed.");
                return;
            }

            settings.BundleLocalCatalog = true;
            settings.BuildRemoteCatalog = true;

            // Create or configure the profile
            string profileName = config.modId;
            string profileId = settings.profileSettings.GetProfileId(profileName);
            if (string.IsNullOrEmpty(profileId))
            {
                profileId = settings.profileSettings.AddProfile(profileName, "Default");
                Debug.Log("ModBuilder: Created Addressables Profile: " + profileName);
            }

            settings.profileSettings.SetValue(profileId, "LocalBuildPath", "[UnityEngine.Application.persistentDataPath]/Mods/" + config.modId);
            settings.profileSettings.SetValue(profileId, "LocalLoadPath", "{UnityEngine.Application.persistentDataPath}/Mods/" + config.modId);
            settings.profileSettings.SetValue(profileId, "RemoteBuildPath", "[UnityEngine.Application.persistentDataPath]/Mods/" + config.modId);
            settings.profileSettings.SetValue(profileId, "RemoteLoadPath", "{UnityEngine.Application.persistentDataPath}/Mods/" + config.modId);
            settings.activeProfileId = profileId;

            // Create or configure group
            AddressableAssetGroup group = settings.FindGroup(config.modId);
            if (group == null)
            {
                group = settings.CreateGroup(config.modId, false, false, false, null);
                Debug.Log("ModBuilder: Created Addressables Group: " + config.modId);
            }

            var schema = group.GetSchema<BundledAssetGroupSchema>();
            if (schema == null)
            {
                schema = group.AddSchema<BundledAssetGroupSchema>();
            }
            schema.BundleMode = BundledAssetGroupSchema.BundlePackingMode.PackTogetherByLabel;
            schema.InternalIdNamingMode = BundledAssetGroupSchema.AssetNamingMode.Filename;
            schema.InternalBundleIdMode = BundledAssetGroupSchema.BundleInternalIdMode.GroupGuidProjectIdHash;
            schema.BundleNaming = BundledAssetGroupSchema.BundleNamingStyle.NoHash;

            // Clear old entries
            List<AddressableAssetEntry> entriesToRemove = new List<AddressableAssetEntry>(group.entries);
            foreach (var entry in entriesToRemove)
            {
                group.RemoveAssetEntry(entry);
            }

            // Register assets in group
            foreach (var path in createdAssetPaths)
            {
                string guid = AssetDatabase.AssetPathToGUID(path);
                AddressableAssetEntry entry = settings.CreateOrMoveEntry(guid, group);
                if (entry != null)
                {
                    entry.address = Path.GetFileNameWithoutExtension(path);
                    entry.SetLabel(config.modId, true, true);

                    string normalizedPath = path.Replace("\\", "/");
                    if (normalizedPath.Contains("/Tooltips/"))
                    {
                        entry.SetLabel("tooltips", true, true);
                    }
                    else if (normalizedPath.Contains("/Visuals/") || normalizedPath.Contains("/BlockVisuals/"))
                    {
                        entry.SetLabel("blockvisuals", true, true);
                    }
                    else if (normalizedPath.Contains("/Items/"))
                    {
                        entry.SetLabel("items", true, true);
                    }
                    else if (normalizedPath.Contains("/Blueprints/"))
                    {
                        entry.SetLabel("blueprints", true, true);
                    }
                    else if (normalizedPath.Contains("/Blocks/"))
                    {
                        entry.SetLabel("blocks", true, true);
                    }
                    else if (normalizedPath.Contains("/CharacterAccessory/"))
                    {
                        entry.SetLabel("characteraccessory", true, true);
                    }
                    else if (normalizedPath.Contains("/AttackGroups/"))
                    {
                        entry.SetLabel("attackgroups", true, true);
                    }
                    else if (normalizedPath.Contains("/Attacks/"))
                    {
                        entry.SetLabel("attacks", true, true);
                    }
                }
            }

            EditorUtility.SetDirty(schema);
            EditorUtility.SetDirty(settings);
            AssetDatabase.SaveAssets();

            var buildPath = settings.profileSettings.GetValueByName(profileId, "LocalBuildPath");
            var localBuildPathEval = settings.profileSettings.EvaluateString(profileId, buildPath);

            Debug.Log("ModBuilder: Starting Addressables compilation build...");
            AddressableAssetSettings.BuildPlayerContent();

            // Post-build cleanup
            if (Directory.Exists(localBuildPathEval))
            {
                string[] catalogs = Directory.GetFiles(localBuildPathEval, "catalog_*.bin");
                if (catalogs.Length > 1)
                {
                    System.Array.Sort(catalogs);
                    string newestCatalog = catalogs[catalogs.Length - 1];
                    foreach (var cat in catalogs)
                    {
                        if (cat != newestCatalog)
                        {
                            try
                            {
                                File.Delete(cat);
                                string hashFile = cat.Replace(".bin", ".hash");
                                if (File.Exists(hashFile))
                                {
                                    File.Delete(hashFile);
                                }
                            }
                            catch (Exception) {}
                        }
                    }
                }
            }

            // Post-build copy sprites
            string spritesFolderPath = modRoot + "/Sprites";
            if (Directory.Exists(spritesFolderPath))
            {
                string[] sprites = Directory.GetFiles(spritesFolderPath, "*.png");
                foreach (var sPath in sprites)
                {
                    string filename = Path.GetFileName(sPath);
                    string destPath = Path.Combine(localBuildPathEval, filename);
                    try
                    {
                        File.Copy(sPath, destPath, true);
                    }
                    catch (Exception ex)
                    {
                        Debug.LogError("ModBuilder: Failed to copy sprite " + filename + ": " + ex.Message);
                    }
                }
            }

            Debug.Log("ModBuilder: SUCCESS - Raw Assets Mod Build completed successfully!");
        }
        catch (Exception e)
        {
            Debug.LogError("ModBuilder Exception: " + e.ToString());
        }
    }

    private static void EnsureDirectoryExists(string path)
    {
        if (!Directory.Exists(path))
        {
            Directory.CreateDirectory(path);
        }
    }

    private static void ConfigureSprites(string modRoot)
    {
        string spritesDir = modRoot + "/Sprites";
        if (!Directory.Exists(spritesDir)) return;

        string[] files = Directory.GetFiles(spritesDir, "*.png");
        foreach (var file in files)
        {
            string cleanPath = file.Replace("\\", "/");
            TextureImporter importer = AssetImporter.GetAtPath(cleanPath) as TextureImporter;
            if (importer != null)
            {
                if (importer.textureType != TextureImporterType.Sprite)
                {
                    importer.textureType = TextureImporterType.Sprite;
                    importer.spriteImportMode = SpriteImportMode.Single;
                    importer.filterMode = FilterMode.Point; // For pixel art!
                    importer.textureCompression = TextureImporterCompression.Uncompressed;
                    importer.SaveAndReimport();
                    Debug.Log("ModBuilder: Configured TextureImporter for " + cleanPath);
                }
            }
        }
    }

    private static void SetFieldReflectively(object target, string fieldName, object value)
    {
        try
        {
            var field = target.GetType().GetField(fieldName, System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
            if (field != null)
            {
                if (field.FieldType.IsAssignableFrom(value.GetType()))
                {
                    field.SetValue(target, value);
                }
                else if (field.FieldType == typeof(string) && value != null)
                {
                    field.SetValue(target, value.ToString());
                }
            }
        }
        catch (Exception)
        {
            // Fail silently or log
        }
    }
}
#endif
