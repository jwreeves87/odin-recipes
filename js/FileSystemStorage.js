const fs = require('fs');
const path = require('path');
const RecipeTemplate = require('./RecipeTemplate');
const Recipe = require('./Recipe');
const cheerio = require('cheerio');

class FileSystemStorage {
  constructor(recipesDir = null) {
    this.recipesDir = recipesDir || path.join(process.cwd(), 'recipes');
    this.template = new RecipeTemplate();
    this.ensureRecipesDirectoryExists();
  }

  ensureRecipesDirectoryExists() {
    if (!fs.existsSync(this.recipesDir)) {
      fs.mkdirSync(this.recipesDir, { recursive: true });
    }
  }

  async writeRecipeFile(recipe, filename) {
    const filePath = path.join(this.recipesDir, filename);
    
    try {
      // Ensure recipe is a Recipe instance for template compatibility
      const recipeInstance = recipe instanceof Recipe ? recipe : new Recipe(recipe);
      
      // Generate HTML content using existing template
      const htmlContent = this.template.render(recipeInstance);
      
      // Embed metadata as JSON in HTML comments
      const metadataJson = JSON.stringify({
        id: recipe.id,
        filename: recipe.filename,
        createdAt: recipe.createdAt,
        modifiedAt: recipe.modifiedAt,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        author: recipe.author,
        sourceUrl: recipe.sourceUrl,
        image: recipe.image
      }, null, 2);

      // Insert metadata into HTML head section manually (Cheerio doesn't preserve comments well)
      const metadataComment = `<!-- RECIPE_METADATA_START\n${metadataJson}\nRECIPE_METADATA_END -->`;
      const headEndIndex = htmlContent.indexOf('</head>');
      
      let finalHtml;
      if (headEndIndex !== -1) {
        // Insert metadata comment just before </head>
        finalHtml = htmlContent.slice(0, headEndIndex) + 
                   '\n  ' + metadataComment + '\n' + 
                   htmlContent.slice(headEndIndex);
      } else {
        // Fallback: append at the end of the document
        finalHtml = htmlContent + '\n' + metadataComment;
      }

      // Write the enhanced HTML to file
      await fs.promises.writeFile(filePath, finalHtml, 'utf8');
      
      return filename;
    } catch (error) {
      throw new Error(`Failed to write recipe file ${filename}: ${error.message}`);
    }
  }

  async readRecipeFile(filename) {
    const filePath = path.join(this.recipesDir, filename);
    
    try {
      const htmlContent = await fs.promises.readFile(filePath, 'utf8');
      return this.extractRecipeFromHtml(htmlContent);
    } catch (error) {
      throw new Error(`Failed to read recipe file ${filename}: ${error.message}`);
    }
  }

  extractRecipeFromHtml(htmlContent) {
    const $ = cheerio.load(htmlContent);
    
    // Try to extract metadata from HTML comments first
    const metadataMatch = htmlContent.match(/<!-- RECIPE_METADATA_START\n([\s\S]*?)\nRECIPE_METADATA_END -->/);
    
    if (metadataMatch) {
      try {
        const metadata = JSON.parse(metadataMatch[1]);
        // Convert date strings back to Date objects
        if (metadata.createdAt) metadata.createdAt = new Date(metadata.createdAt);
        if (metadata.modifiedAt) metadata.modifiedAt = new Date(metadata.modifiedAt);
        return metadata;
      } catch (error) {
        console.warn('Failed to parse recipe metadata, falling back to HTML parsing');
      }
    }

    // Fallback: parse HTML structure for older files without metadata
    return this.parseRecipeFromHtml($);
  }

  parseRecipeFromHtml($) {
    // Extract basic recipe information from HTML structure
    // This is a fallback for recipes without embedded metadata
    
    const title = $('h1').first().text().replace(/🔥/g, '').trim() || 'Untitled Recipe';
    const description = $('.recipe-header p').first().text() || '';
    
    // Extract ingredients from list
    const ingredients = [];
    $('ul li').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text && !text.includes('Prep:') && !text.includes('Cook:') && !text.includes('Serves:')) {
        ingredients.push(text);
      }
    });

    // Extract instructions from ordered list
    const instructions = [];
    $('ol li').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text) {
        instructions.push(text);
      }
    });

    return {
      title,
      description,
      ingredients,
      instructions,
      prepTime: '',
      cookTime: '',
      servings: '',
      author: '',
      sourceUrl: '',
      image: $('img.recipe-image').attr('src') || ''
    };
  }

  async deleteRecipeFile(filename) {
    const filePath = path.join(this.recipesDir, filename);
    
    try {
      if (!fs.existsSync(filePath)) {
        return false;
      }
      
      await fs.promises.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Failed to delete recipe file ${filename}: ${error.message}`);
      return false;
    }
  }

  async listRecipeFiles() {
    try {
      const files = await fs.promises.readdir(this.recipesDir);
      return files.filter(file => file.endsWith('.html')).sort();
    } catch (error) {
      console.error(`Failed to list recipe files: ${error.message}`);
      return [];
    }
  }

  fileExists(filename) {
    const filePath = path.join(this.recipesDir, filename);
    return fs.existsSync(filePath);
  }
}

module.exports = FileSystemStorage;