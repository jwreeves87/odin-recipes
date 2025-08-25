const RecipeRepository = require('./RecipeRepository');
const RecipeValidator = require('./RecipeValidator');
const IndexPageUpdater = require('./IndexPageUpdater');
const Recipe = require('./Recipe');

class RecipeManager {
  constructor(repository = null, validator = null, indexUpdater = null) {
    this.repository = repository || new RecipeRepository();
    this.validator = validator || new RecipeValidator();
    this.indexUpdater = indexUpdater || new IndexPageUpdater();
  }

  async createRecipe(recipeData) {
    try {
      // Validate the recipe data
      const validation = this.validator.validateForCreate(recipeData);
      
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Create Recipe instance from sanitized data
      const recipe = new Recipe(validation.sanitizedData);

      // Save to repository
      const createdRecipe = await this.repository.create(recipe);

      // Update index page
      const indexResult = this.indexUpdater.addRecipeToIndex(
        createdRecipe,
        createdRecipe.filename
      );

      return {
        success: true,
        recipe: createdRecipe,
        indexUpdateFailed: !indexResult.success
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to create recipe: ${error.message}`
      };
    }
  }

  async getRecipe(id) {
    try {
      const recipe = await this.repository.findById(id);
      
      if (!recipe) {
        return {
          success: false,
          error: `Recipe with ID ${id} not found`
        };
      }

      return {
        success: true,
        recipe: recipe
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to get recipe: ${error.message}`
      };
    }
  }

  async updateRecipe(id, updates) {
    try {
      // Validate the update data
      const validation = this.validator.validateForUpdate(updates);
      
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Check if recipe exists
      const existingRecipe = await this.repository.findById(id);
      if (!existingRecipe) {
        return {
          success: false,
          error: `Recipe with ID ${id} not found`
        };
      }

      // Update recipe with sanitized data
      const updatedRecipe = await this.repository.update(id, validation.sanitizedData);

      // Update index page
      const indexResult = this.indexUpdater.updateRecipeInIndex(
        updatedRecipe,
        updatedRecipe.filename
      );

      return {
        success: true,
        recipe: updatedRecipe,
        indexUpdateFailed: !indexResult.success
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to update recipe: ${error.message}`
      };
    }
  }

  async deleteRecipe(id) {
    try {
      // Check if recipe exists and get its filename
      const existingRecipe = await this.repository.findById(id);
      if (!existingRecipe) {
        return {
          success: false,
          error: `Recipe with ID ${id} not found`
        };
      }

      // Delete from repository
      const deleted = await this.repository.delete(id);
      
      if (!deleted) {
        return {
          success: false,
          error: 'Failed to delete recipe from storage'
        };
      }

      // Remove from index page
      const indexResult = this.indexUpdater.removeRecipeFromIndex(
        existingRecipe.filename
      );

      return {
        success: true,
        indexUpdateFailed: !indexResult.success
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to delete recipe: ${error.message}`
      };
    }
  }

  async getAllRecipes() {
    try {
      const recipes = await this.repository.findAll();

      return {
        success: true,
        recipes: recipes
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to get recipes: ${error.message}`
      };
    }
  }

  async searchRecipes(searchTerm) {
    try {
      const allRecipes = await this.repository.findAll();

      if (!searchTerm || searchTerm.trim() === '') {
        return {
          success: true,
          recipes: allRecipes
        };
      }

      const normalizedTerm = searchTerm.toLowerCase().trim();
      const matchingRecipes = allRecipes.filter(recipe => {
        const titleMatch = recipe.title && recipe.title.toLowerCase().includes(normalizedTerm);
        const descriptionMatch = recipe.description && recipe.description.toLowerCase().includes(normalizedTerm);
        return titleMatch || descriptionMatch;
      });

      return {
        success: true,
        recipes: matchingRecipes
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to search recipes: ${error.message}`
      };
    }
  }
}

module.exports = RecipeManager;