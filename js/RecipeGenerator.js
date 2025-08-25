// Import dependencies for Node.js environment
if (typeof require !== 'undefined') {
  var RecipeClass = require('./Recipe');
  var RecipeTemplateClass = require('./RecipeTemplate');
} else {
  // In browser, use global classes
  var RecipeClass = Recipe;
  var RecipeTemplateClass = RecipeTemplate;
}

class RecipeGenerator {
  constructor() {
    this.template = new RecipeTemplateClass();
  }

  generate(recipeData) {
    const recipe = new RecipeClass(recipeData);
    
    return {
      html: this.template.render(recipe),
      filename: recipe.getFilename()
    };
  }
}

// Make available for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RecipeGenerator;
} else if (typeof window !== 'undefined') {
  window.RecipeGenerator = RecipeGenerator;
}