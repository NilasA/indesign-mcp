/**
 * @fileoverview Special features tools for InDesign MCP
 * Batch 5: Special characters, layers, tables, status
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { executeExtendScript, escapeExtendScriptString } from "../../extendscript.js";
import { markInDesignStatusChecked } from "../layout/index.js";
import { toPoints } from "../../utils/coords.js";
import type { SpecialCharacterType, LayerAction, LayerColor, TextPosition } from "../../types.js";
import { withChangeTracking } from "../../utils/changeSummary.js";

/**
 * Registers special features tools with the MCP server
 */
export async function registerSpecialTools(server: McpServer): Promise<void> {
  // Register insert_special_character tool
  server.tool(
    "insert_special_character",
    {
      character_type: z.enum([
        "auto_page_number", "next_page_number", "previous_page_number",
        "em_dash", "en_dash", "copyright", "registered", "trademark",
        "section_symbol", "paragraph_symbol", "bullet", "ellipsis",
        "forced_line_break", "column_break", "frame_break", "page_break"
      ]).describe("Type of special character to insert"),
      position: z.enum(["selection", "end", "start"]).default("end").describe("Where to insert"),
      story_index: z.number().int().default(0).describe("Story index (0-based)")
    },
    withChangeTracking(server, "insert_special_character")(async (args: any) => {
      return await handleInsertSpecialCharacter(args);
    })
  );

  // Register manage_layers tool
  server.tool(
    "manage_layers",
    {
      action: z.enum(["create", "delete", "rename", "list"]).describe("Action to perform"),
      layer_name: z.string().describe("Layer name").optional(),
      new_name: z.string().default("").describe("New name for rename action"),
      layer_color: z.string().default("Light Blue").describe("Layer color")
    },
    async (args) => {
      return await handleManageLayers(args);
    }
  );

  // Register create_table tool
  server.tool(
    "create_table",
    {
      rows: z.number().int().describe("Number of rows"),
      columns: z.number().int().describe("Number of columns"),
      x: z.union([z.number(), z.string()]).describe("X position (supports units: 100, '50mm', '2in', '72pt', '50%')"),
      y: z.union([z.number(), z.string()]).describe("Y position (supports units: 100, '50mm', '2in', '72pt', '50%')"),
      width: z.union([z.number(), z.string()]).describe("Table width (supports units: 100, '50mm', '2in', '72pt', '50%')"),
      height: z.union([z.number(), z.string()]).describe("Table height (supports units: 100, '50mm', '2in', '72pt', '50%')")
    },
    async (args) => {
      return await handleCreateTable(args);
    }
  );

  // Register indesign_status tool
  server.tool(
    "indesign_status",
    {},
    async (args) => {
      return await handleInDesignStatus(args);
    }
  );
}


async function handleInsertSpecialCharacter(args: any): Promise<{ content: TextContent[] }> {
  if (!args.character_type) {
    throw new Error("character_type parameter is required");
  }
  
  const characterType: SpecialCharacterType = args.character_type;
  const position: TextPosition = args.position || "end";
  const storyIndex = args.story_index || 0;
  
  // Map character types to InDesign SpecialCharacters enum
  const charMap: Record<SpecialCharacterType, string> = {
    "auto_page_number": "SpecialCharacters.AUTO_PAGE_NUMBER",
    "next_page_number": "SpecialCharacters.NEXT_PAGE_NUMBER",
    "previous_page_number": "SpecialCharacters.PREVIOUS_PAGE_NUMBER",
    "em_dash": "SpecialCharacters.EM_DASH",
    "en_dash": "SpecialCharacters.EN_DASH",
    "copyright": "SpecialCharacters.COPYRIGHT_SYMBOL",
    "registered": "SpecialCharacters.REGISTERED_TRADEMARK",
    "trademark": "SpecialCharacters.TRADEMARK_SYMBOL",
    "section_symbol": "SpecialCharacters.SECTION_SYMBOL",
    "paragraph_symbol": "SpecialCharacters.PARAGRAPH_SYMBOL",
    "bullet": "SpecialCharacters.BULLET_CHARACTER",
    "ellipsis": "SpecialCharacters.ELLIPSIS_CHARACTER",
    "forced_line_break": "SpecialCharacters.FORCED_LINE_BREAK",
    "column_break": "SpecialCharacters.COLUMN_BREAK",
    "frame_break": "SpecialCharacters.FRAME_BREAK",
    "page_break": "SpecialCharacters.PAGE_BREAK"
  };
  
  const specialChar = charMap[characterType];
  
  const script = `
    var doc = app.activeDocument;
    if (doc.stories.length <= ${storyIndex}) {
      throw new Error("Story index out of range.");
    }
    
    var story = doc.stories[${storyIndex}];
    var insertionPoint;
    
    if ("${position}" === "start") {
      insertionPoint = story.insertionPoints[0];
    } else if ("${position}" === "end") {
      insertionPoint = story.insertionPoints[-1];
    } else {
      // selection
      if (app.selection.length > 0 && app.selection[0].hasOwnProperty("insertionPoints")) {
        insertionPoint = app.selection[0].insertionPoints[0];
      } else {
        insertionPoint = story.insertionPoints[-1];
      }
    }
    
    insertionPoint.contents = ${specialChar};
    "Special character '${characterType}' inserted successfully";
  `;
  
  const result = await executeExtendScript(script);
  
  return {
    content: [{
      type: "text",
      text: result.success ? `Successfully inserted special character: ${result.result}` : `Error inserting special character: ${result.error}`
    }]
  };
}

async function handleManageLayers(args: any): Promise<{ content: TextContent[] }> {
  if (!args.action) {
    throw new Error("action parameter is required");
  }
  
  const action: LayerAction = args.action;
  const layerName = args.layer_name ? escapeExtendScriptString(args.layer_name) : "";
  const newName = args.new_name ? escapeExtendScriptString(args.new_name) : "";
  const layerColor: LayerColor = args.layer_color || "Light Blue";
  
  const script = `
    var doc = app.activeDocument;
    var result = "";
    
    switch("${action}") {
      case "create":
        if ("${layerName}" === "") {
          throw new Error("Layer name is required for create action.");
        }
        
        var newLayer = doc.layers.add();
        newLayer.name = "${layerName}";
        var colorEnum = UIColors["${layerColor.toUpperCase().replace(/ /g, "_")}"] || UIColors.LIGHT_BLUE;
        newLayer.layerColor = colorEnum;
        result = "Created layer '" + "${layerName}" + "'";
        break;
        
      case "delete":
        if ("${layerName}" === "") {
          throw new Error("Layer name is required for delete action.");
        }
        
        var layerToDelete = doc.layers.itemByName("${layerName}");
        if (layerToDelete.isValid) {
          layerToDelete.remove();
          result = "Deleted layer '" + "${layerName}" + "'";
        } else {
          throw new Error("Layer '" + "${layerName}" + "' not found.");
        }
        break;
        
      case "rename":
        if ("${layerName}" === "" || "${newName}" === "") {
          throw new Error("Both old and new layer names are required for rename action.");
        }
        
        var layerToRename = doc.layers.itemByName("${layerName}");
        if (layerToRename.isValid) {
          layerToRename.name = "${newName}";
          result = "Renamed layer '" + "${layerName}" + "' to '" + "${newName}" + "'";
        } else {
          throw new Error("Layer '" + "${layerName}" + "' not found.");
        }
        break;
        
      case "list":
        var layerList = [];
        layerList.push("=== Layers in " + doc.name + " ===");
        layerList.push("");
        
        for (var i = 0; i < doc.layers.length; i++) {
          var layer = doc.layers[i];
          var layerInfo = (i + 1) + ". " + layer.name;
          
          try {
            layerInfo += " (Visible: " + layer.visible + ", Locked: " + layer.locked + ")";
          } catch(e) {
            // Skip if properties not accessible
          }
          
          layerList.push(layerInfo);
        }
        
        result = layerList.join("\\n");
        break;
        
      default:
        throw new Error("Unknown layer action: " + "${action}");
    }
    
    result;
  `;
  
  const result = await executeExtendScript(script);
  
  return {
    content: [{
      type: "text",
      text: result.success ? `Successfully managed layers: ${result.result}` : `Error managing layers: ${result.error}`
    }]
  };
}

async function handleCreateTable(args: any): Promise<{ content: TextContent[] }> {
  if (args.rows === undefined || args.rows === null) {
    throw new Error("rows parameter is required");
  }
  if (args.columns === undefined || args.columns === null) {
    throw new Error("columns parameter is required");
  }
  if (args.x === undefined || args.x === null) {
    throw new Error("x parameter is required");
  }
  if (args.y === undefined || args.y === null) {
    throw new Error("y parameter is required");
  }
  if (args.width === undefined || args.width === null) {
    throw new Error("width parameter is required");
  }
  if (args.height === undefined || args.height === null) {
    throw new Error("height parameter is required");
  }
  
  const rows = args.rows;
  const columns = args.columns;
  
  // Get page dimensions for unit conversion (use defaults if not available)
  const pageDimsScript = `
    if (app.documents.length === 0) {
      throw new Error("No documents are open in InDesign. Please open a document first.");
    }
    var doc = app.activeDocument;
    var page = doc.pages[0];
    var bounds = page.bounds;
    JSON.stringify({ width: bounds[3] - bounds[1], height: bounds[2] - bounds[0] });
  `;
  
  let pageWidth = 612; // Default US Letter width in points
  let pageHeight = 792; // Default US Letter height in points
  
  try {
    const pageDimsResult = await executeExtendScript(pageDimsScript);
    if (pageDimsResult.success && pageDimsResult.result) {
      const dims = JSON.parse(pageDimsResult.result);
      pageWidth = dims.width;
      pageHeight = dims.height;
    }
  } catch (e) {
    // Use defaults if page dimension detection fails
  }
  
  const x = toPoints(args.x!, "x", pageWidth, pageHeight);
  const y = toPoints(args.y!, "y", pageWidth, pageHeight);
  const width = toPoints(args.width!, "w", pageWidth, pageHeight);
  const height = toPoints(args.height!, "h", pageWidth, pageHeight);
  
  const script = `
    var doc = app.activeDocument;
    
    var oldUnit = app.scriptPreferences.measurementUnit;
    var oldHU = doc.viewPreferences.horizontalMeasurementUnits;
    var oldVU = doc.viewPreferences.verticalMeasurementUnits;
    try {
      app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
      doc.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.POINTS;
      doc.viewPreferences.verticalMeasurementUnits = MeasurementUnits.POINTS;
      
      var page = doc.pages[0]; // Create on first page by default
      
      // Create a text frame first
      var textFrame = page.textFrames.add();
      textFrame.geometricBounds = [${y}, ${x}, ${y + height}, ${x + width}];
      
      // Create table in the text frame
      var table = textFrame.tables.add();
      table.bodyRowCount = ${rows};
      table.columnCount = ${columns};
      
      // Set some basic formatting
      table.width = ${width};
      table.height = ${height};
      
      "Created table with " + ${rows} + " rows and " + ${columns} + " columns";
    } finally {
      app.scriptPreferences.measurementUnit = oldUnit;
      doc.viewPreferences.horizontalMeasurementUnits = oldHU;
      doc.viewPreferences.verticalMeasurementUnits = oldVU;
    }
  `;
  
  const result = await executeExtendScript(script);
  
  return {
    content: [{
      type: "text",
      text: result.success ? `Successfully created table: ${result.result}` : `Error creating table: ${result.error}`
    }]
  };
}

// ------------------------------ InDesign Status -------------------------------

async function handleInDesignStatus(_args: any): Promise<{ content: TextContent[] }> {
  const script = `
    var status = [];
    status.push("=== InDesign Status ===");
    status.push("Application: " + app.name + " " + app.version);
    status.push("Documents open: " + app.documents.length);
    
    if (app.documents.length > 0) {
      var doc = app.activeDocument;
      status.push("Active document: " + doc.name);
      status.push("Document stories: " + doc.stories.length);
      status.push("Document pages: " + doc.pages.length);
      if (doc.stories.length > 0) {
        status.push("\nFirst story preview: " + doc.stories[0].contents.substring(0, 100) + "...");
      }
    } else {
      status.push("\nNo documents are currently open.");
    }
    status.join("\n");
  `;

  const result = await executeExtendScript(script);
  if (result.success) {
    // Let layout tools know status verified
    markInDesignStatusChecked();
  }
  return {
    content: [{
      type: "text",
      text: result.success ? result.result! : `Error checking InDesign status: ${result.error}`
    }]
  };
}