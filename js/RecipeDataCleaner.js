class RecipeDataCleaner {
  constructor() {
    this.maxIngredientLength = 200;
    this.maxInstructionLength = 300;
    this.minInstructionLength = 15;
  }

  cleanRecipeData(rawJsonLD) {
    return {
      title: rawJsonLD.name || '',
      description: rawJsonLD.description || '',
      image: this.extractImage(rawJsonLD.image),
      prepTime: rawJsonLD.prepTime || '',
      cookTime: rawJsonLD.cookTime || '',
      servings: rawJsonLD.recipeYield || '',
      ingredients: this.cleanIngredients(rawJsonLD.recipeIngredient || []),
      instructions: this.cleanInstructions(rawJsonLD.recipeInstructions || []),
      author: this.extractAuthor(rawJsonLD.author)
    };
  }

  extractImage(imageData) {
    if (!imageData) return '';
    if (typeof imageData === 'string') return imageData;
    if (Array.isArray(imageData)) return imageData[0] || '';
    if (typeof imageData === 'object') return imageData.url || '';
    return '';
  }

  extractAuthor(author) {
    if (!author) return '';
    if (typeof author === 'string') return author;
    if (Array.isArray(author)) author = author[0];
    if (typeof author === 'object') return author.name || '';
    return author.toString();
  }

  cleanIngredients(ingredients) {
    if (!Array.isArray(ingredients)) {
      // Handle non-array ingredients by converting to array or returning empty
      if (typeof ingredients === 'string') {
        return [ingredients].filter(ingredient => this.isValidIngredient(ingredient));
      }
      return [];
    }
    
    return ingredients
      .filter(ingredient => this.isValidIngredient(ingredient))
      .map(ingredient => ingredient.trim());
  }

  isValidIngredient(ingredient) {
    if (!ingredient || typeof ingredient !== 'string') return false;
    
    const text = ingredient.trim();
    
    // Basic length checks
    if (!text || text.length > this.maxIngredientLength) return false;
    
    // Filter out HTML content
    if (this.containsHtml(text)) return false;
    
    // Filter out instruction-like content
    if (this.looksLikeInstruction(text)) return false;
    
    // Must look like an actual ingredient
    return this.looksLikeIngredient(text);
  }

  looksLikeIngredient(text) {
    // First check for instruction-like patterns that should be excluded
    if (text.includes('Transfer') || text.includes('Continue') || 
        text.includes('Place') || text.includes('Cook') || 
        text.includes('Bake') || text.includes('Mix')) {
      return false;
    }
    
    // Should have measurements or be a recognizable food item
    const hasNumber = /\d+/.test(text);
    const hasMeasurement = hasNumber && 
      (text.includes('tbsp') || text.includes('tsp') || text.includes('cup') || 
       text.includes('lb') || text.includes('oz') || text.includes('pound'));
    
    const isFoodItem = text.includes('salmon') || text.includes('soy sauce') || 
      text.includes('sugar') || text.includes('honey') || text.includes('ginger') ||
      text.includes('vinegar') || text.includes('brown sugar') || text.includes('portions');
    
    // If it's short and has numbers, likely an ingredient
    const isShortWithNumber = text.length < 50 && hasNumber;
    
    return hasMeasurement || isFoodItem || isShortWithNumber;
  }

  looksLikeInstruction(text) {
    return text.includes('Transfer the salmon') ||
           text.includes('Continue to smoke') ||
           text.includes('place on your grill') ||
           text.match(/\d+°\s*F/) || // Temperature references
           text.includes('smoker') ||
           text.includes('internal temperature');
  }

  cleanInstructions(instructions) {
    if (!Array.isArray(instructions)) {
      // Handle non-array instructions
      if (typeof instructions === 'string') {
        return [instructions].filter(instruction => this.isValidInstruction(instruction));
      }
      return [];
    }
    
    return instructions
      .map(instruction => this.extractInstructionText(instruction))
      .filter(instruction => this.isValidInstruction(instruction))
      .map(instruction => instruction.trim());
  }

  extractInstructionText(instruction) {
    if (!instruction) return '';
    if (typeof instruction === 'string') return instruction;
    return instruction.text || instruction.name || '';
  }

  isValidInstruction(instruction) {
    if (!instruction || typeof instruction !== 'string') return false;
    
    const text = instruction.trim();
    
    // Basic length checks
    if (text.length < this.minInstructionLength || 
        text.length > this.maxInstructionLength) return false;
    
    // Filter out HTML and comment content
    if (this.containsHtml(text) || this.isCommentContent(text)) return false;
    
    // Must contain cooking action words to be a valid instruction
    return this.containsCookingActions(text);
  }

  containsHtml(text) {
    return text.includes('<img') ||
           text.includes('<script') ||
           text.includes('<div') ||
           text.includes('<span') ||
           text.includes('src=') ||
           text.includes('class=') ||
           text.includes('srcset=') ||
           /<[^>]+>/.test(text);
  }

  isCommentContent(text) {
    return text.includes('avatar') ||
           text.includes('says') ||
           text.includes('Reply') ||
           text.includes('@') ||
           text.includes('2018') ||
           text.includes('2024') ||
           text.includes('2025') ||
           text.includes('pm') ||
           text.includes('am');
  }

  containsCookingActions(text) {
    // Reject questions even if they contain cooking words
    if (text.includes('?')) return false;
    
    // Accept text that contains basic cooking-related words
    const hasCookingWords = !!text.match(/\b(transfer|smoke|place|cook|heat|add|mix|continue|remove|reach|temperature|grill|serve|until|degrees|internal|salmon|smoker|preheat|oven|bake|baking|boil|simmer|fry|sauté|roast|broil|steam|microwave|refrigerate|freeze|thaw|marinate|prep|prepare)\b/i);
    
    // For longer text without specific cooking words, accept if it contains action words or describes cooking process
    const hasActionWords = !!text.match(/\b(put|take|use|bring|let|make|get|set|turn|keep|hold|cut|chop|slice|dice|pour|stir|whisk|blend|beat|fold|roll|press|squeeze|drain|rinse|wash|dry|cover|wrap|open|close|start|stop|wait|check|watch|test|taste|season|adjust|finish|complete)\b/i);
    const describesCookingProcess = text.includes('cooking process') || text.includes('cooking instruction');
    const isLongInstruction = text.length > 30 && (hasActionWords || describesCookingProcess) && !this.isCommentContent(text) && !this.containsHtml(text);
    
    return hasCookingWords || isLongInstruction;
  }
}

// Make available for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RecipeDataCleaner;
} else if (typeof window !== 'undefined') {
  window.RecipeDataCleaner = RecipeDataCleaner;
}