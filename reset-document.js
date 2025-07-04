#!/usr/bin/env node
/**
 * Simple document reset script for evolutionary testing
 * Usage: node reset-document.js
 */

import { executeExtendScript } from './dist/extendscript.js';

async function resetDocument() {
  console.log('🔄 Resetting InDesign document...');
  
  const script = `
    if (app.documents.length === 0) {
      throw new Error("No documents are open in InDesign");
    }
    
    var doc = app.activeDocument;
    var results = [];
    
    // Clear all page items (more thorough than just text frames)
    for (var p = doc.pages.length - 1; p >= 0; p--) {
      var page = doc.pages[p];
      var itemCount = page.allPageItems.length;
      
      // Remove all page items (includes text frames, images, shapes, etc.)
      for (var i = page.allPageItems.length - 1; i >= 0; i--) {
        try {
          page.allPageItems[i].remove();
        } catch (e) {
          // Some items might be locked or on master pages
        }
      }
      
      results.push("Page " + (p + 1) + ": removed " + itemCount + " items");
    }
    
    // Also clear stories that might not be in frames
    for (var s = doc.stories.length - 1; s >= 0; s--) {
      try {
        if (doc.stories[s].textContainers.length === 0) {
          doc.stories[s].contents = "";
        }
      } catch (e) {
        // Some stories might be protected
      }
    }
    
    // Remove custom paragraph styles (keep built-in ones)
    var removedPStyles = 0;
    for (var ps = doc.paragraphStyles.length - 1; ps >= 0; ps--) {
      var style = doc.paragraphStyles[ps];
      try {
        // Only remove custom styles, not built-in ones
        if (style.name !== "[No Paragraph Style]" && 
            style.name !== "[Basic Paragraph]" &&
            style.name !== "NormalParagraphStyle" &&
            !style.name.match(/^\\[.*\\]$/)) {
          style.remove();
          removedPStyles++;
        }
      } catch (e) {
        // Style might be in use or protected
      }
    }
    
    // Remove custom character styles (keep built-in ones)  
    var removedCStyles = 0;
    for (var cs = doc.characterStyles.length - 1; cs >= 0; cs--) {
      var charStyle = doc.characterStyles[cs];
      try {
        // Only remove custom styles, not built-in ones
        if (charStyle.name !== "[None]" && 
            charStyle.name !== "NormalCharacterStyle" &&
            !charStyle.name.match(/^\\[.*\\]$/)) {
          charStyle.remove();
          removedCStyles++;
        }
      } catch (e) {
        // Style might be in use or protected
      }
    }
    
    results.push("Removed " + removedPStyles + " custom paragraph styles");
    results.push("Removed " + removedCStyles + " custom character styles");
    results.push("Document reset completed successfully");
    
    results.join("\\n");
  `;
  
  try {
    const result = await executeExtendScript(script);
    
    if (result.success) {
      console.log('✅ Document reset successful!');
      console.log(result.result);
    } else {
      console.error('❌ Document reset failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Reset script error:', error.message);
    process.exit(1);
  }
}

resetDocument().catch(console.error);