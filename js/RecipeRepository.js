const Recipe = require('./Recipe');
const FileSystemStorage = require('./FileSystemStorage');
const crypto = require('crypto');

class RecipeRepository {
  constructor(storage = null) {
    this.storage = storage || new FileSystemStorage();
  }

  async create(recipe) {
    const id = this.generateId();
    const filename = `${id}.html`;
    const now = new Date();

    const recipeWithMetadata = {
      ...recipe,
      id: id,
      filename: filename,
      createdAt: now,
      modifiedAt: now
    };

    await this.storage.writeRecipeFile(recipeWithMetadata, filename);
    return recipeWithMetadata;
  }

  async findById(id) {
    // First try the UUID-based filename (for new recipes)
    const uuidFilename = `${id}.html`;
    
    if (this.storage.fileExists(uuidFilename)) {
      try {
        const recipe = await this.storage.readRecipeFile(uuidFilename);
        if (recipe && recipe.id === id) {
          return recipe;
        }
      } catch (error) {
        console.error(`Error reading recipe ${id} from UUID file:`, error.message);
      }
    }

    // If not found, search through all recipe files (for legacy recipes with original filenames)
    try {
      const filenames = await this.storage.listRecipeFiles();
      
      for (const filename of filenames) {
        try {
          const recipe = await this.storage.readRecipeFile(filename);
          if (recipe && recipe.id === id) {
            return recipe;
          }
        } catch (error) {
          console.error(`Error reading recipe file ${filename}:`, error.message);
          // Continue with other files
        }
      }
      
      return null; // Recipe not found
    } catch (error) {
      console.error(`Error searching for recipe ${id}:`, error.message);
      return null;
    }
  }

  async update(id, updates) {
    const existingRecipe = await this.findById(id);
    
    if (!existingRecipe) {
      return null;
    }

    const updatedRecipe = {
      ...existingRecipe,
      ...updates,
      id: existingRecipe.id, // preserve ID
      filename: existingRecipe.filename, // preserve filename
      createdAt: existingRecipe.createdAt, // preserve creation date
      modifiedAt: new Date() // update modification date
    };

    await this.storage.writeRecipeFile(updatedRecipe, existingRecipe.filename);
    return updatedRecipe;
  }

  async delete(id) {
    // First find the recipe to get its actual filename
    const recipe = await this.findById(id);
    
    if (!recipe) {
      return false;
    }

    const filename = recipe.filename;
    
    if (!this.storage.fileExists(filename)) {
      return false;
    }

    try {
      await this.storage.deleteRecipeFile(filename);
      return true;
    } catch (error) {
      console.error(`Error deleting recipe ${id}:`, error.message);
      return false;
    }
  }

  async findAll() {
    try {
      const filenames = await this.storage.listRecipeFiles();
      const recipes = [];

      for (const filename of filenames) {
        try {
          const recipe = await this.storage.readRecipeFile(filename);
          if (recipe) {
            recipes.push(recipe);
          }
        } catch (error) {
          console.error(`Error reading recipe file ${filename}:`, error.message);
          // Continue with other files
        }
      }

      return recipes.sort((a, b) => {
        // Sort by modification date, newest first
        return new Date(b.modifiedAt) - new Date(a.modifiedAt);
      });
    } catch (error) {
      console.error('Error listing recipes:', error.message);
      return [];
    }
  }

  generateId() {
    return crypto.randomUUID();
  }
}

module.exports = RecipeRepository;